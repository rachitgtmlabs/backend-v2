"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestratorStep = void 0;
const workflows_1 = require("@mastra/core/workflows");
const schemas_1 = require("./schemas");
function summarizeUiContext(ctx) {
    const parts = [];
    if (ctx.portfolio_id)
        parts.push(`portfolio_id=${ctx.portfolio_id}`);
    if (ctx.property_id)
        parts.push(`property_id=${ctx.property_id}`);
    if (ctx.lease_id)
        parts.push(`lease_id=${ctx.lease_id}`);
    if (ctx.active_tab)
        parts.push(`active_tab=${ctx.active_tab}`);
    if (ctx.focused_widget)
        parts.push(`focused_widget=${ctx.focused_widget}`);
    if (ctx.date_range)
        parts.push(`date_range=${ctx.date_range}`);
    return parts.length
        ? `\n\n## UI context\n${parts.join('\n')}`
        : '\n\n## UI context\n(none — no portfolio/property/lease pre-selected)';
}
const ID_KEYS = new Set([
    'id',
    'portfolio_id',
    'property_id',
    'lease_id',
    'amendmentId',
    'leaseId',
    'propertyId',
    'portfolioId',
    'itemId',
]);
function collectIds(value, path = [], out = []) {
    if (Array.isArray(value)) {
        value.forEach((v, i) => collectIds(v, [...path, `[${i}]`], out));
        return out;
    }
    if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
            if (ID_KEYS.has(k) && typeof v === 'string' && v) {
                out.push({ path: [...path, k].join('.'), key: k, value: v });
            }
            else {
                collectIds(v, [...path, k], out);
            }
        }
    }
    return out;
}
function summarizePriorResults(state) {
    if (state.iteration === 0 || state.completedTasks.length === 0)
        return '';
    const blocks = state.completedTasks.map((t) => {
        if (t.status !== 'completed') {
            return `### ${t.taskId} — ${t.toolName} (${t.status})\nerror: ${t.error ?? 'unknown error'}`;
        }
        const full = JSON.stringify(t.output, null, 2);
        const body = full.length > 6000 ? full.slice(0, 6000) + '\n…(truncated)' : full;
        const ids = collectIds(t.output);
        const idLines = ids.length > 0
            ? '\nExtracted ids:\n' +
                ids.map((i) => `  - ${i.path} = ${JSON.stringify(i.value)}`).join('\n')
            : '';
        return `### ${t.taskId} — ${t.toolName} (completed)\n${body}${idLines}`;
    });
    return `\n\n## Prior task results (from earlier iterations of this same request)\n${blocks.join('\n\n')}`;
}
function summarizeRecentMessages(state) {
    if (!state.recentMessages?.length)
        return '';
    const lines = state.recentMessages
        .slice(-4)
        .map((m) => `${m.role}: ${m.content}`);
    return `\n\n## Recent conversation\n${lines.join('\n')}`;
}
function buildPrompt(state) {
    const header = state.iteration === 0
        ? "## User's request"
        : `## Replan (iteration ${state.iteration})\nOriginal user request:`;
    const replanInstruction = state.iteration > 0
        ? `\n\n## Replan instructions
- Read "Prior task results" above carefully. The "Extracted ids" lines list every real id discovered so far — use those LITERAL values when planning the next tasks. Never invent ids.
- If those results already let you answer the user's request, set isComplete=true and taskGraph=null.
- If a search returned multiple ambiguous candidates, set isComplete=true and needsUserClarification=true (taskGraph=null).
- If a search returned no rows, set isComplete=true and needsUserClarification=true (taskGraph=null).
- Otherwise, plan the next batch of tasks using the discovered ids. Do not repeat tasks that already completed successfully above.`
        : `\n\n## Plan instructions
- If the user references an entity by NAME (e.g. "first property", "Apex Tower", "the Silverline portfolio") and the matching id is NOT in the UI context, your first iteration MUST emit a single dynamic search-* task — nothing else. The next iteration will see the search results and you can then plan the actual fetch tasks.
- If the user's question can be answered with one or more fetch-* tools using only the UI context ids, emit all of them in parallel (empty dependsOn).`;
    return [
        header,
        state.userRequest,
        summarizeRecentMessages(state),
        summarizeUiContext(state.uiContext),
        summarizePriorResults(state),
        replanInstruction,
    ]
        .filter(Boolean)
        .join('\n');
}
exports.orchestratorStep = (0, workflows_1.createStep)({
    id: 'lease-orchestrator-step',
    inputSchema: schemas_1.dagStateSchema,
    outputSchema: schemas_1.dagStateSchema,
    execute: async ({ inputData, mastra }) => {
        const state = inputData;
        const agent = mastra?.getAgentById('lease-orchestrator-agent');
        if (!agent) {
            return {
                ...state,
                isComplete: true,
                needsUserClarification: false,
                taskGraph: undefined,
                artifactType: 'text',
                orchestratorThoughts: [
                    ...state.orchestratorThoughts,
                    'Orchestrator agent unavailable.',
                ],
            };
        }
        const prompt = buildPrompt(state);
        let parsed = null;
        let lastError = null;
        for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
            try {
                const result = await agent.generate(prompt, {
                    structuredOutput: {
                        schema: schemas_1.orchestratorOutputSchema,
                        errorStrategy: 'warn',
                    },
                });
                const obj = result.object;
                if (obj) {
                    parsed = obj;
                    break;
                }
                const text = result.text ?? '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = schemas_1.orchestratorOutputSchema.parse(JSON.parse(jsonMatch[0]));
                }
            }
            catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
        }
        if (!parsed) {
            return {
                ...state,
                isComplete: true,
                needsUserClarification: false,
                taskGraph: undefined,
                artifactType: 'text',
                orchestratorThoughts: [
                    ...state.orchestratorThoughts,
                    `Orchestrator failed to produce a plan${lastError ? `: ${lastError}` : ''}.`,
                ],
            };
        }
        return {
            ...state,
            isComplete: parsed.isComplete,
            needsUserClarification: parsed.needsUserClarification,
            artifactType: parsed.artifactType ?? state.artifactType ?? 'text',
            taskGraph: parsed.taskGraph ?? undefined,
            orchestratorThoughts: [
                ...state.orchestratorThoughts,
                parsed.thought,
            ],
        };
    },
});
//# sourceMappingURL=orchestrator.step.js.map