"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.answeringStep = void 0;
const workflows_1 = require("@mastra/core/workflows");
const schemas_1 = require("./schemas");
async function emit(writer, event) {
    if (!writer)
        return;
    try {
        await writer.write(event);
    }
    catch {
    }
}
function describeTaskResults(state) {
    if (state.completedTasks.length === 0)
        return '(no tool results)';
    return state.completedTasks
        .map((r) => {
        if (r.status !== 'completed') {
            return `### ${r.taskId} — ${r.toolName} (${r.status})\nerror: ${r.error ?? 'n/a'}`;
        }
        return `### ${r.taskId} — ${r.toolName}\n${JSON.stringify(r.output, null, 2)}`;
    })
        .join('\n\n');
}
function buildPrompt(state) {
    return [
        `## User's question`,
        state.userRequest,
        state.recentMessages?.length
            ? `\n## Recent conversation\n${state.recentMessages
                .slice(-4)
                .map((m) => `${m.role}: ${m.content}`)
                .join('\n')}`
            : '',
        state.needsUserClarification
            ? `\n## Ambiguity notice\nThe search returned multiple candidates — list them as a numbered list and ask which one they mean. Set highlightWidgets=[] and suggestedFollowUps=[].`
            : '',
        `\n## Tool results\n${describeTaskResults(state)}`,
        `\n## Orchestrator thoughts (most recent last)\n${state.orchestratorThoughts.join('\n') || '(none)'}`,
        `\n## Reminder\nGround every claim in the tool results above. If a tool returned a "supported soon" note, repeat that plainly. Keep the answer casual and short unless the question requires detail.`,
    ]
        .filter(Boolean)
        .join('\n');
}
function coerceToAnswer(result) {
    const r = result;
    if (r.object && typeof r.object === 'object') {
        const direct = schemas_1.answeringOutputSchema.safeParse(r.object);
        if (direct.success)
            return direct.data;
        const backfilled = schemas_1.answeringOutputSchema.safeParse({
            answer: '',
            citations: [],
            highlightWidgets: [],
            suggestedFollowUps: [],
            ...r.object,
        });
        if (backfilled.success)
            return backfilled.data;
    }
    const text = (r.text ?? '').trim();
    if (!text)
        return null;
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) {
        try {
            const candidate = JSON.parse(text.slice(first, last + 1));
            if (candidate && typeof candidate === 'object') {
                const backfilled = schemas_1.answeringOutputSchema.safeParse({
                    answer: typeof candidate.answer === 'string' ? candidate.answer : '',
                    citations: Array.isArray(candidate.citations)
                        ? candidate.citations
                        : [],
                    highlightWidgets: Array.isArray(candidate.highlightWidgets)
                        ? candidate.highlightWidgets
                        : [],
                    suggestedFollowUps: Array.isArray(candidate.suggestedFollowUps)
                        ? candidate.suggestedFollowUps
                        : [],
                });
                if (backfilled.success && backfilled.data.answer) {
                    return backfilled.data;
                }
            }
        }
        catch {
        }
    }
    return {
        answer: text,
        citations: [],
        highlightWidgets: [],
        suggestedFollowUps: [],
    };
}
function synthesizeFromToolResults(state) {
    const completed = state.completedTasks.filter((t) => t.status === 'completed');
    if (completed.length === 0) {
        return {
            answer: "I couldn't put together a response just now. Could you rephrase the question, or try again in a moment?",
            citations: [],
            highlightWidgets: [],
            suggestedFollowUps: [],
        };
    }
    const blocks = completed
        .map((t) => `**${t.toolName}** — \`\`\`\n${JSON.stringify(t.output, null, 2).slice(0, 800)}\n\`\`\``)
        .join('\n\n');
    return {
        answer: `I had trouble drafting a clean response, but here's what the tools returned:\n\n${blocks}`,
        citations: [],
        highlightWidgets: [],
        suggestedFollowUps: [],
    };
}
exports.answeringStep = (0, workflows_1.createStep)({
    id: 'lease-answering-step',
    inputSchema: schemas_1.dagStateSchema,
    outputSchema: schemas_1.chatResponseSchema,
    execute: async ({ inputData, mastra, writer }) => {
        const state = inputData;
        const agent = mastra?.getAgentById('lease-answering-agent');
        if (!agent) {
            const offline = {
                answer: 'Sorry, the assistant is currently unavailable.',
                citations: [],
                highlightWidgets: [],
                suggestedFollowUps: [],
            };
            await emit(writer, {
                type: 'final',
                ...offline,
                iterationsUsed: state.iteration,
                toolsUsed: state.toolsUsed,
            });
            return {
                ...offline,
                iterationsUsed: state.iteration,
                toolsUsed: state.toolsUsed,
            };
        }
        await emit(writer, {
            type: 'status',
            stage: 'answering',
            state: 'started',
        });
        const prompt = buildPrompt(state);
        let parsed = null;
        for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
            try {
                const result = await agent.generate(prompt, {
                    structuredOutput: {
                        schema: schemas_1.answeringOutputSchema,
                        errorStrategy: 'warn',
                    },
                });
                parsed = coerceToAnswer(result);
            }
            catch {
            }
        }
        if (!parsed)
            parsed = synthesizeFromToolResults(state);
        await emit(writer, {
            type: 'final',
            answer: parsed.answer,
            citations: parsed.citations,
            highlightWidgets: parsed.highlightWidgets,
            suggestedFollowUps: parsed.suggestedFollowUps,
            iterationsUsed: state.iteration,
            toolsUsed: state.toolsUsed,
        });
        return {
            ...parsed,
            iterationsUsed: state.iteration,
            toolsUsed: state.toolsUsed,
        };
    },
});
//# sourceMappingURL=answering.step.js.map