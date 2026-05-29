"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolutionStep = void 0;
const workflows_1 = require("@mastra/core/workflows");
const common_1 = require("@nestjs/common");
const schemas_1 = require("./schemas");
const registry_1 = require("../tools/registry");
const logger = new common_1.Logger('LeaseChatResolution');
async function emit(writer, event) {
    if (!writer)
        return;
    try {
        await writer.write(event);
    }
    catch {
    }
}
function groupByLevel(tasks) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const indegree = new Map();
    for (const t of tasks) {
        indegree.set(t.id, t.dependsOn.filter((d) => byId.has(d)).length);
    }
    const levels = [];
    const completed = new Set();
    let remaining = tasks.length;
    while (remaining > 0) {
        const level = tasks.filter((t) => !completed.has(t.id) && (indegree.get(t.id) ?? 0) === 0);
        if (level.length === 0) {
            const leftover = tasks.filter((t) => !completed.has(t.id));
            levels.push(leftover);
            break;
        }
        levels.push(level);
        for (const t of level) {
            completed.add(t.id);
            remaining--;
            for (const other of tasks) {
                if (other.dependsOn.includes(t.id)) {
                    indegree.set(other.id, (indegree.get(other.id) ?? 1) - 1);
                }
            }
        }
    }
    return levels;
}
function resolveInputs(inputs, outputs) {
    const resolved = {};
    for (const [k, v] of Object.entries(inputs)) {
        resolved[k] = resolveValue(v, outputs);
    }
    return resolved;
}
function resolveValue(value, outputs) {
    if (typeof value === 'string' && value.startsWith('$')) {
        return readPath(value.slice(1), outputs);
    }
    if (Array.isArray(value)) {
        return value.map((v) => resolveValue(v, outputs));
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = resolveValue(v, outputs);
        }
        return out;
    }
    return value;
}
function readPath(path, outputs) {
    const tokens = tokenize(path);
    if (tokens.length === 0)
        return undefined;
    const [taskId, ...rest] = tokens;
    let cur = outputs.get(taskId);
    for (const tok of rest) {
        if (cur === undefined || cur === null)
            return undefined;
        if (typeof tok === 'number') {
            cur = cur[tok];
        }
        else {
            cur = cur[tok];
        }
    }
    return cur;
}
function tokenize(path) {
    const out = [];
    const re = /([^.[\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path))) {
        if (m[1] !== undefined)
            out.push(m[1]);
        else if (m[2] !== undefined)
            out.push(Number(m[2]));
    }
    return out;
}
function parseInputs(raw) {
    if (raw == null)
        return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw !== 'string')
        return {};
    const trimmed = raw.trim();
    if (!trimmed)
        return {};
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    }
    catch {
        return {};
    }
}
async function executeOne(task, outputs, toolExecCtx, writer) {
    const tool = registry_1.TOOL_REGISTRY[task.toolName];
    if (!tool) {
        logger.warn(`[tool] unknown name=${task.toolName} task=${task.id}`);
        return {
            taskId: task.id,
            toolName: task.toolName,
            status: 'failed',
            output: null,
            error: `Unknown tool: ${task.toolName}`,
        };
    }
    await emit(writer, {
        type: 'tool_started',
        taskId: task.id,
        toolName: task.toolName,
        taskTitle: task.taskTitle,
    });
    const t0 = Date.now();
    try {
        const rawInputs = parseInputs(task.inputs);
        const inputs = resolveInputs(rawInputs, outputs);
        const output = await tool.execute(inputs, toolExecCtx);
        const durationMs = Date.now() - t0;
        logger.log(`[tool] name=${task.toolName} task=${task.id} status=ok duration=${durationMs}ms`);
        await emit(writer, {
            type: 'tool_completed',
            taskId: task.id,
            toolName: task.toolName,
            status: 'completed',
            durationMs,
        });
        return {
            taskId: task.id,
            toolName: task.toolName,
            status: 'completed',
            output,
        };
    }
    catch (err) {
        const durationMs = Date.now() - t0;
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`[tool] name=${task.toolName} task=${task.id} status=fail duration=${durationMs}ms err=${errorMessage}`);
        await emit(writer, {
            type: 'tool_completed',
            taskId: task.id,
            toolName: task.toolName,
            status: 'failed',
            durationMs,
            error: errorMessage,
        });
        return {
            taskId: task.id,
            toolName: task.toolName,
            status: 'failed',
            output: null,
            error: errorMessage,
        };
    }
}
exports.resolutionStep = (0, workflows_1.createStep)({
    id: 'lease-resolution-step',
    inputSchema: schemas_1.dagStateSchema,
    outputSchema: schemas_1.dagStateSchema,
    execute: async ({ inputData, requestContext, writer }) => {
        const state = inputData;
        const graph = state.taskGraph ?? [];
        if (state.isComplete || graph.length === 0) {
            return {
                ...state,
                iteration: state.iteration + 1,
                taskGraph: undefined,
            };
        }
        const levels = groupByLevel(graph);
        const outputsById = new Map();
        const newResults = [];
        const failed = new Set();
        let breakForDynamic = false;
        const toolCtx = { requestContext };
        for (const level of levels) {
            const runnable = level.filter((t) => !t.dependsOn.some((d) => failed.has(d)));
            const skipped = level
                .filter((t) => t.dependsOn.some((d) => failed.has(d)))
                .map((t) => ({
                taskId: t.id,
                toolName: t.toolName,
                status: 'skipped',
                output: null,
                error: 'Upstream dependency failed',
            }));
            for (const s of skipped) {
                await emit(writer, {
                    type: 'tool_completed',
                    taskId: s.taskId,
                    toolName: s.toolName,
                    status: 'skipped',
                    durationMs: 0,
                    error: s.error,
                });
            }
            newResults.push(...skipped);
            const results = await Promise.all(runnable.map((t) => executeOne(t, outputsById, toolCtx, writer)));
            for (const r of results) {
                newResults.push(r);
                if (r.status === 'completed') {
                    outputsById.set(r.taskId, r.output);
                }
                else {
                    failed.add(r.taskId);
                }
            }
            const dynamicWithDeps = runnable.find((t) => t.isDynamic &&
                graph.some((g) => g.dependsOn.includes(t.id)));
            if (dynamicWithDeps) {
                breakForDynamic = true;
                break;
            }
        }
        const toolsUsed = Array.from(new Set([...state.toolsUsed, ...graph.map((g) => g.toolName)]));
        return {
            ...state,
            iteration: state.iteration + 1,
            toolsUsed,
            completedTasks: [...state.completedTasks, ...newResults],
            taskGraph: undefined,
            isComplete: breakForDynamic ? false : state.isComplete,
        };
    },
});
//# sourceMappingURL=resolution.step.js.map