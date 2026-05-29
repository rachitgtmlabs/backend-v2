"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatResponseSchema = exports.answeringOutputSchema = exports.orchestratorOutputSchema = exports.dagStateSchema = exports.uiContextSchema = exports.taskResultSchema = exports.taskNodeSchema = exports.toolNameEnum = exports.TOOL_NAMES = void 0;
const zod_1 = require("zod");
exports.TOOL_NAMES = [
    'search-portfolios',
    'search-properties',
    'list-portfolios',
    'fetch-lease-document',
    'fetch-tasks-alerts',
    'fetch-portfolio-overview',
    'fetch-property-details',
    'fetch-lease-evolution',
    'fetch-amendment-history',
    'fetch-risk-summary',
    'fetch-open-tasks',
    'fetch-expiring-leases',
    'fetch-cam-data',
    'fetch-lease-clauses',
    'fetch-reminders',
];
exports.toolNameEnum = zod_1.z.enum(exports.TOOL_NAMES);
exports.taskNodeSchema = zod_1.z.object({
    id: zod_1.z.string().describe('Unique task id, e.g. "t1", "t2"'),
    toolName: exports.toolNameEnum.describe('Tool to invoke for this task'),
    inputs: zod_1.z
        .string()
        .describe('JSON-encoded object of inputs to pass to the tool. Example: "{\\"portfolio_id\\":\\"pf_abc\\",\\"property_id\\":\\"prp_x\\"}". Reference upstream task outputs with "$taskId.path.to.field" inside string values, e.g. "{\\"portfolio_id\\":\\"$t1.matches[0].id\\"}".'),
    dependsOn: zod_1.z
        .array(zod_1.z.string())
        .describe('Task ids this task depends on. Empty array if none.'),
    isDynamic: zod_1.z
        .boolean()
        .describe('True if this task discovers ids/items that downstream tasks would need (e.g. search-*). Dynamic tasks must be LEAF nodes — no other task may depend on them.'),
    taskTitle: zod_1.z
        .string()
        .describe('Short UI-facing title shown while task runs (3-6 words).'),
});
exports.taskResultSchema = zod_1.z.object({
    taskId: zod_1.z.string(),
    toolName: zod_1.z.string(),
    status: zod_1.z.enum(['completed', 'failed', 'skipped']),
    output: zod_1.z.unknown(),
    error: zod_1.z.string().optional(),
});
exports.uiContextSchema = zod_1.z.object({
    portfolio_id: zod_1.z.string().optional(),
    property_id: zod_1.z.string().optional(),
    lease_id: zod_1.z.string().optional(),
    active_tab: zod_1.z.string().optional(),
    focused_widget: zod_1.z.string().optional(),
    date_range: zod_1.z.string().optional(),
});
exports.dagStateSchema = zod_1.z.object({
    userRequest: zod_1.z.string(),
    uiContext: exports.uiContextSchema,
    recentMessages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string(),
    }))
        .default([]),
    iteration: zod_1.z.number(),
    toolsUsed: zod_1.z.array(zod_1.z.string()),
    completedTasks: zod_1.z.array(exports.taskResultSchema),
    isComplete: zod_1.z.boolean(),
    needsUserClarification: zod_1.z.boolean().default(false),
    artifactType: zod_1.z.enum(['text', 'table', 'timeline', 'chart']).optional(),
    taskGraph: zod_1.z.array(exports.taskNodeSchema).optional(),
    orchestratorThoughts: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.orchestratorOutputSchema = zod_1.z.object({
    thought: zod_1.z
        .string()
        .describe('Brief plain-language reasoning (1-2 sentences) about what is being done or why more info is needed. Third person, no internal jargon.'),
    isComplete: zod_1.z
        .boolean()
        .describe('True if request is fully answered, blocked, or needs user clarification. When true, taskGraph must be null.'),
    needsUserClarification: zod_1.z
        .boolean()
        .describe('True if a dynamic task returned multiple ambiguous candidates and the user must choose.'),
    artifactType: zod_1.z
        .enum(['text', 'table', 'timeline', 'chart'])
        .nullable()
        .describe('Output format for the final answer.'),
    taskGraph: zod_1.z
        .array(exports.taskNodeSchema)
        .nullable()
        .describe('Tasks to execute this iteration. Must be null when isComplete is true.'),
});
exports.answeringOutputSchema = zod_1.z.object({
    answer: zod_1.z
        .string()
        .describe('Markdown answer for the chat bubble. Conversational, grounded only in completed task results.'),
    citations: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string(),
        source: zod_1.z.enum(['LEASE', 'AMENDMENT', 'TASK', 'ALERT', 'CALC']),
    }))
        .describe('Source tags (LEASE = lease doc, AMENDMENT = amendment, TASK = open task, ALERT = property alert, CALC = derived/computed). Empty array if none.'),
    highlightWidgets: zod_1.z
        .array(zod_1.z.string())
        .describe('Dashboard widget keys to highlight, e.g. "expiring-leases", "cam-recovery", "risk-summary". Empty array if none.'),
    suggestedFollowUps: zod_1.z
        .array(zod_1.z.string())
        .describe('Up to 3 short follow-up questions the user might ask next.'),
});
exports.chatResponseSchema = exports.answeringOutputSchema.extend({
    iterationsUsed: zod_1.z.number(),
    toolsUsed: zod_1.z.array(zod_1.z.string()),
});
//# sourceMappingURL=schemas.js.map