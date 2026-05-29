import { createStep } from '@mastra/core/workflows';
import {
  answeringOutputSchema,
  chatResponseSchema,
  dagStateSchema,
  type AnsweringOutput,
  type DagState,
} from './schemas';

function describeTaskResults(state: DagState): string {
  if (state.completedTasks.length === 0) return '(no tool results)';
  return state.completedTasks
    .map((r) => {
      if (r.status !== 'completed') {
        return `### ${r.taskId} — ${r.toolName} (${r.status})\nerror: ${r.error ?? 'n/a'}`;
      }
      return `### ${r.taskId} — ${r.toolName}\n${JSON.stringify(r.output, null, 2)}`;
    })
    .join('\n\n');
}

function buildPrompt(state: DagState): string {
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
    `\n## Orchestrator thoughts (most recent last)\n${
      state.orchestratorThoughts.join('\n') || '(none)'
    }`,
    `\n## Reminder\nGround every claim in the tool results above. If a tool returned a "supported soon" note, repeat that plainly. Keep the answer casual and short unless the question requires detail.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Coerce whatever the LLM returned into a valid AnsweringOutput. Three paths:
 *   1. `result.object` already matches the schema (native json_schema win).
 *   2. The raw text contains a JSON blob — try to parse + zod-validate it.
 *      Partial JSON (missing optional/array fields) gets backfilled rather
 *      than rejected, so users never see a raw zod error blob.
 *   3. No JSON anywhere — surface the text as a plain `answer`.
 */
function coerceToAnswer(result: unknown): AnsweringOutput | null {
  const r = result as { object?: unknown; text?: string };

  if (r.object && typeof r.object === 'object') {
    const direct = answeringOutputSchema.safeParse(r.object);
    if (direct.success) return direct.data;
    const backfilled = answeringOutputSchema.safeParse({
      answer: '',
      citations: [],
      highlightWidgets: [],
      suggestedFollowUps: [],
      ...(r.object as Record<string, unknown>),
    });
    if (backfilled.success) return backfilled.data;
  }

  const text = (r.text ?? '').trim();
  if (!text) return null;

  // Greedy JSON extraction — first `{` to last `}`, then validate.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      const candidate = JSON.parse(text.slice(first, last + 1));
      if (candidate && typeof candidate === 'object') {
        const backfilled = answeringOutputSchema.safeParse({
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
    } catch {
      // Fall through to raw-text path.
    }
  }

  // Last resort: treat the whole text as the answer, drop ancillary fields.
  return {
    answer: text,
    citations: [],
    highlightWidgets: [],
    suggestedFollowUps: [],
  };
}

/**
 * Final-final fallback: structured output completely failed AND raw text was
 * empty. Build an answer from the tool results we DO have so the user gets
 * something useful instead of "please try again".
 */
function synthesizeFromToolResults(state: DagState): AnsweringOutput {
  const completed = state.completedTasks.filter((t) => t.status === 'completed');
  if (completed.length === 0) {
    return {
      answer:
        "I couldn't put together a response just now. Could you rephrase the question, or try again in a moment?",
      citations: [],
      highlightWidgets: [],
      suggestedFollowUps: [],
    };
  }
  // Surface the raw tool outputs so the user at least sees the data we found.
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

export const answeringStep = createStep({
  id: 'lease-answering-step',
  inputSchema: dagStateSchema,
  outputSchema: chatResponseSchema,
  execute: async ({ inputData, mastra }) => {
    const state = inputData as DagState;
    const agent = mastra?.getAgentById('lease-answering-agent');
    if (!agent) {
      return {
        answer: 'Sorry, the assistant is currently unavailable.',
        citations: [],
        highlightWidgets: [],
        suggestedFollowUps: [],
        iterationsUsed: state.iteration,
        toolsUsed: state.toolsUsed,
      };
    }

    const prompt = buildPrompt(state);

    let parsed: AnsweringOutput | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const result = await agent.generate(prompt, {
          structuredOutput: {
            schema: answeringOutputSchema,
            errorStrategy: 'warn',
          },
        });
        parsed = coerceToAnswer(result);
      } catch {
        // Swallow — try again or fall through to synthesis below.
      }
    }

    // Never serve a raw zod error or "please try again" if we have data —
    // synthesize from completedTasks so the user gets something grounded.
    if (!parsed) parsed = synthesizeFromToolResults(state);

    return {
      ...parsed,
      iterationsUsed: state.iteration,
      toolsUsed: state.toolsUsed,
    };
  },
});
