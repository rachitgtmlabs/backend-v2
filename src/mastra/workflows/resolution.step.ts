import { createStep } from '@mastra/core/workflows';
import { Logger } from '@nestjs/common';
import {
  dagStateSchema,
  type DagState,
  type TaskNode,
  type TaskResult,
} from './schemas';
import { TOOL_REGISTRY } from '../tools/registry';
import type { ChatStreamEvent } from '../../chat/chat-stream.types';

const logger = new Logger('LeaseChatResolution');

/** Best-effort writer.write — never let a closed stream break the workflow. */
async function emit(
  writer: { write: (data: unknown) => Promise<void> } | undefined,
  event: ChatStreamEvent,
): Promise<void> {
  if (!writer) return;
  try {
    await writer.write(event);
  } catch {
    /* swallow */
  }
}

/** Group nodes by topological level. Tasks in the same level can run in parallel. */
function groupByLevel(tasks: TaskNode[]): TaskNode[][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const indegree = new Map<string, number>();
  for (const t of tasks) {
    indegree.set(t.id, t.dependsOn.filter((d) => byId.has(d)).length);
  }

  const levels: TaskNode[][] = [];
  const completed = new Set<string>();
  let remaining = tasks.length;

  while (remaining > 0) {
    const level = tasks.filter(
      (t) => !completed.has(t.id) && (indegree.get(t.id) ?? 0) === 0,
    );
    if (level.length === 0) {
      // cycle or unresolved dependency — emit the rest as a single batch to avoid a hang
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

/**
 * Resolve "$taskId.path.to.field" references in an inputs object against
 * the map of completed task results.
 */
function resolveInputs(
  inputs: Record<string, unknown>,
  outputs: Map<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(inputs)) {
    resolved[k] = resolveValue(v, outputs);
  }
  return resolved;
}

function resolveValue(value: unknown, outputs: Map<string, unknown>): unknown {
  if (typeof value === 'string' && value.startsWith('$')) {
    return readPath(value.slice(1), outputs);
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v, outputs));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveValue(v, outputs);
    }
    return out;
  }
  return value;
}

function readPath(path: string, outputs: Map<string, unknown>): unknown {
  // path = "taskId.foo.bar[0].baz"
  const tokens = tokenize(path);
  if (tokens.length === 0) return undefined;
  const [taskId, ...rest] = tokens;
  let cur = outputs.get(taskId as string);
  for (const tok of rest) {
    if (cur === undefined || cur === null) return undefined;
    if (typeof tok === 'number') {
      cur = (cur as unknown[])[tok];
    } else {
      cur = (cur as Record<string, unknown>)[tok];
    }
  }
  return cur;
}

function tokenize(path: string): Array<string | number> {
  const out: Array<string | number> = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(Number(m[2]));
  }
  return out;
}

function parseInputs(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  // The wire schema gives us a JSON-encoded string. Be defensive: if a future
  // caller hands us a plain object, accept it.
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string') return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

async function executeOne(
  task: TaskNode,
  outputs: Map<string, unknown>,
  toolExecCtx: { requestContext: unknown },
  writer: { write: (data: unknown) => Promise<void> } | undefined,
): Promise<TaskResult> {
  const tool = TOOL_REGISTRY[task.toolName];
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
    // Tools receive a Mastra-style ToolExecutionContext whose `requestContext`
    // carries the caller's organization_id. They read RBAC scope from there
    // (NOT from inputs) so the orchestrator never has the chance to forget,
    // override, or be tricked into leaking cross-tenant data.
    const output = await tool.execute(inputs, toolExecCtx);
    const durationMs = Date.now() - t0;
    logger.log(
      `[tool] name=${task.toolName} task=${task.id} status=ok duration=${durationMs}ms`,
    );
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
  } catch (err) {
    const durationMs = Date.now() - t0;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(
      `[tool] name=${task.toolName} task=${task.id} status=fail duration=${durationMs}ms err=${errorMessage}`,
    );
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

export const resolutionStep = createStep({
  id: 'lease-resolution-step',
  inputSchema: dagStateSchema,
  outputSchema: dagStateSchema,
  execute: async ({ inputData, requestContext, writer }) => {
    const state = inputData as DagState;
    const graph = state.taskGraph ?? [];
    if (state.isComplete || graph.length === 0) {
      return {
        ...state,
        iteration: state.iteration + 1,
        taskGraph: undefined,
      };
    }

    const levels = groupByLevel(graph);
    const outputsById = new Map<string, unknown>();
    const newResults: TaskResult[] = [];
    const failed = new Set<string>();
    let breakForDynamic = false;

    // Mastra threads the RequestContext set by chat.service.ts down to every
    // step. We re-wrap it in the ToolExecutionContext shape that tools expect.
    const toolCtx = { requestContext };

    for (const level of levels) {
      // Skip tasks whose upstream deps already failed
      const runnable = level.filter(
        (t) => !t.dependsOn.some((d) => failed.has(d)),
      );
      const skipped = level
        .filter((t) => t.dependsOn.some((d) => failed.has(d)))
        .map(
          (t): TaskResult => ({
            taskId: t.id,
            toolName: t.toolName,
            status: 'skipped',
            output: null,
            error: 'Upstream dependency failed',
          }),
        );
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

      const results = await Promise.all(
        runnable.map((t) => executeOne(t, outputsById, toolCtx, writer)),
      );
      for (const r of results) {
        newResults.push(r);
        if (r.status === 'completed') {
          outputsById.set(r.taskId, r.output);
        } else {
          failed.add(r.taskId);
        }
      }

      // Dynamic-task boundary: if any task in this level is dynamic AND has
      // downstream dependents in the graph, break for replan.
      const dynamicWithDeps = runnable.find(
        (t) =>
          t.isDynamic &&
          graph.some((g) => g.dependsOn.includes(t.id)),
      );
      if (dynamicWithDeps) {
        breakForDynamic = true;
        break;
      }
    }

    const toolsUsed = Array.from(
      new Set([...state.toolsUsed, ...graph.map((g) => g.toolName)]),
    );

    return {
      ...state,
      iteration: state.iteration + 1,
      toolsUsed,
      completedTasks: [...state.completedTasks, ...newResults],
      taskGraph: undefined,
      // If we broke for a dynamic task, force a replan: isComplete stays false.
      isComplete: breakForDynamic ? false : state.isComplete,
    };
  },
});
