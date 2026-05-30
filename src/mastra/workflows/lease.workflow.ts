import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  chatResponseSchema,
  dagStateSchema,
  uiContextSchema,
} from './schemas';
import { orchestratorStep } from './orchestrator.step';
import { resolutionStep } from './resolution.step';
import { answeringStep } from './answering.step';

const MAX_REPLAN_ITERATIONS = 4;

export const leaseWorkflowInputSchema = z.object({
  userRequest: z.string(),
  uiContext: uiContextSchema.default({}),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
});

/** Inner loop: orchestrator -> resolution, repeated until isComplete. */
const planExecuteWorkflow = createWorkflow({
  id: 'lease-plan-execute',
  inputSchema: dagStateSchema,
  outputSchema: dagStateSchema,
})
  .then(orchestratorStep)
  .then(resolutionStep)
  .commit();

const replanLoop = createWorkflow({
  id: 'lease-replan-loop',
  inputSchema: dagStateSchema,
  outputSchema: dagStateSchema,
})
  .dountil(planExecuteWorkflow, async ({ inputData }) => {
    if (!inputData) return true;
    const state = inputData;
    return (
      state.isComplete === true ||
      state.needsUserClarification === true ||
      state.iteration >= MAX_REPLAN_ITERATIONS
    );
  })
  .commit();

export const leaseWorkflow = createWorkflow({
  id: 'lease-chat-workflow',
  inputSchema: leaseWorkflowInputSchema,
  outputSchema: chatResponseSchema,
})
  .map(async ({ inputData }) => {
    const input = inputData as z.infer<typeof leaseWorkflowInputSchema>;
    return {
      userRequest: input.userRequest,
      uiContext: input.uiContext ?? {},
      recentMessages: input.recentMessages ?? [],
      iteration: 0,
      toolsUsed: [],
      completedTasks: [],
      isComplete: false,
      needsUserClarification: false,
      artifactType: undefined,
      taskGraph: undefined,
      orchestratorThoughts: [],
    };
  })
  .then(replanLoop)
  .then(answeringStep)
  .commit();
