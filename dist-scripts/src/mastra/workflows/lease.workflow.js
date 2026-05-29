"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseWorkflow = exports.leaseWorkflowInputSchema = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
const schemas_1 = require("./schemas");
const orchestrator_step_1 = require("./orchestrator.step");
const resolution_step_1 = require("./resolution.step");
const answering_step_1 = require("./answering.step");
const MAX_REPLAN_ITERATIONS = 4;
exports.leaseWorkflowInputSchema = zod_1.z.object({
    userRequest: zod_1.z.string(),
    uiContext: schemas_1.uiContextSchema.default({}),
    recentMessages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string(),
    }))
        .default([]),
});
const planExecuteWorkflow = (0, workflows_1.createWorkflow)({
    id: 'lease-plan-execute',
    inputSchema: schemas_1.dagStateSchema,
    outputSchema: schemas_1.dagStateSchema,
})
    .then(orchestrator_step_1.orchestratorStep)
    .then(resolution_step_1.resolutionStep)
    .commit();
const replanLoop = (0, workflows_1.createWorkflow)({
    id: 'lease-replan-loop',
    inputSchema: schemas_1.dagStateSchema,
    outputSchema: schemas_1.dagStateSchema,
})
    .dountil(planExecuteWorkflow, async ({ inputData }) => {
    if (!inputData)
        return true;
    const state = inputData;
    return (state.isComplete === true ||
        state.needsUserClarification === true ||
        state.iteration >= MAX_REPLAN_ITERATIONS);
})
    .commit();
exports.leaseWorkflow = (0, workflows_1.createWorkflow)({
    id: 'lease-chat-workflow',
    inputSchema: exports.leaseWorkflowInputSchema,
    outputSchema: schemas_1.chatResponseSchema,
})
    .map(async ({ inputData }) => {
    const input = inputData;
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
    .then(answering_step_1.answeringStep)
    .commit();
//# sourceMappingURL=lease.workflow.js.map