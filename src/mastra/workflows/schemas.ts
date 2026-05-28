import { z } from 'zod';

/** Names of tools the orchestrator may schedule. */
export const TOOL_NAMES = [
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
] as const;

export const toolNameEnum = z.enum(TOOL_NAMES);
export type ToolName = z.infer<typeof toolNameEnum>;

/** Single node in the orchestrator's task graph. */
export const taskNodeSchema = z.object({
  id: z.string().describe('Unique task id, e.g. "t1", "t2"'),
  toolName: toolNameEnum.describe('Tool to invoke for this task'),
  inputs: z
    .string()
    .describe(
      'JSON-encoded object of inputs to pass to the tool. Example: "{\\"portfolio_id\\":\\"pf_abc\\",\\"property_id\\":\\"prp_x\\"}". Reference upstream task outputs with "$taskId.path.to.field" inside string values, e.g. "{\\"portfolio_id\\":\\"$t1.matches[0].id\\"}".',
    ),
  dependsOn: z
    .array(z.string())
    .describe('Task ids this task depends on. Empty array if none.'),
  isDynamic: z
    .boolean()
    .describe(
      'True if this task discovers ids/items that downstream tasks would need (e.g. search-*). Dynamic tasks must be LEAF nodes — no other task may depend on them.',
    ),
  taskTitle: z
    .string()
    .describe('Short UI-facing title shown while task runs (3-6 words).'),
});
export type TaskNode = z.infer<typeof taskNodeSchema>;

/** Output of one tool execution. */
export const taskResultSchema = z.object({
  taskId: z.string(),
  toolName: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  output: z.unknown(),
  error: z.string().optional(),
});
export type TaskResult = z.infer<typeof taskResultSchema>;

/** UI context the frontend passes in. */
export const uiContextSchema = z.object({
  portfolio_id: z.string().optional(),
  property_id: z.string().optional(),
  lease_id: z.string().optional(),
  active_tab: z.string().optional(),
  focused_widget: z.string().optional(),
  date_range: z.string().optional(),
});
export type UIContext = z.infer<typeof uiContextSchema>;

/** State that flows through the workflow. */
export const dagStateSchema = z.object({
  userRequest: z.string(),
  uiContext: uiContextSchema,
  recentMessages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
  iteration: z.number(),
  toolsUsed: z.array(z.string()),
  completedTasks: z.array(taskResultSchema),
  isComplete: z.boolean(),
  needsUserClarification: z.boolean().default(false),
  artifactType: z.enum(['text', 'table', 'timeline', 'chart']).optional(),
  taskGraph: z.array(taskNodeSchema).optional(),
  orchestratorThoughts: z.array(z.string()).default([]),
});
export type DagState = z.infer<typeof dagStateSchema>;

/** Orchestrator agent's structured output. */
export const orchestratorOutputSchema = z.object({
  thought: z
    .string()
    .describe(
      'Brief plain-language reasoning (1-2 sentences) about what is being done or why more info is needed. Third person, no internal jargon.',
    ),
  isComplete: z
    .boolean()
    .describe(
      'True if request is fully answered, blocked, or needs user clarification. When true, taskGraph must be null.',
    ),
  needsUserClarification: z
    .boolean()
    .describe(
      'True if a dynamic task returned multiple ambiguous candidates and the user must choose.',
    ),
  artifactType: z
    .enum(['text', 'table', 'timeline', 'chart'])
    .nullable()
    .describe('Output format for the final answer.'),
  taskGraph: z
    .array(taskNodeSchema)
    .nullable()
    .describe(
      'Tasks to execute this iteration. Must be null when isComplete is true.',
    ),
});
export type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;

/** Final answering agent's structured output, shape the frontend renders. */
export const answeringOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'Markdown answer for the chat bubble. Conversational, grounded only in completed task results.',
    ),
  citations: z
    .array(
      z.object({
        text: z.string(),
        source: z.enum(['LEASE', 'AMENDMENT', 'TASK', 'ALERT', 'CALC']),
      }),
    )
    .describe(
      'Source tags (LEASE = lease doc, AMENDMENT = amendment, TASK = open task, ALERT = property alert, CALC = derived/computed). Empty array if none.',
    ),
  highlightWidgets: z
    .array(z.string())
    .describe(
      'Dashboard widget keys to highlight, e.g. "expiring-leases", "cam-recovery", "risk-summary". Empty array if none.',
    ),
  suggestedFollowUps: z
    .array(z.string())
    .describe('Up to 3 short follow-up questions the user might ask next.'),
});
export type AnsweringOutput = z.infer<typeof answeringOutputSchema>;

/** Full chat response shape returned to the frontend. */
export const chatResponseSchema = answeringOutputSchema.extend({
  iterationsUsed: z.number(),
  toolsUsed: z.array(z.string()),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;
