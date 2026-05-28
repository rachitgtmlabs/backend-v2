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
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const result = await agent.generate(prompt, {
          structuredOutput: {
            schema: answeringOutputSchema,
            errorStrategy: 'warn',
          },
        });
        const obj = (result as { object?: unknown }).object;
        if (obj) {
          parsed = obj as AnsweringOutput;
          break;
        }
        const text = (result as { text?: string }).text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = answeringOutputSchema.parse(JSON.parse(jsonMatch[0]));
        } else if (text) {
          parsed = {
            answer: text,
            citations: [],
            highlightWidgets: [],
            suggestedFollowUps: [],
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!parsed) {
      return {
        answer: `I had trouble composing a response${lastError ? ` (${lastError})` : ''}. Please try again.`,
        citations: [],
        highlightWidgets: [],
        suggestedFollowUps: [],
        iterationsUsed: state.iteration,
        toolsUsed: state.toolsUsed,
      };
    }

    return {
      ...parsed,
      iterationsUsed: state.iteration,
      toolsUsed: state.toolsUsed,
    };
  },
});
