import { z } from 'zod';
export declare const TOOL_NAMES: readonly ["search-portfolios", "search-properties", "list-portfolios", "fetch-lease-document", "fetch-tasks-alerts", "fetch-portfolio-overview", "fetch-property-details", "fetch-lease-evolution", "fetch-amendment-history", "fetch-risk-summary", "fetch-open-tasks", "fetch-expiring-leases", "fetch-cam-data", "fetch-lease-clauses", "fetch-reminders"];
export declare const toolNameEnum: z.ZodEnum<["search-portfolios", "search-properties", "list-portfolios", "fetch-lease-document", "fetch-tasks-alerts", "fetch-portfolio-overview", "fetch-property-details", "fetch-lease-evolution", "fetch-amendment-history", "fetch-risk-summary", "fetch-open-tasks", "fetch-expiring-leases", "fetch-cam-data", "fetch-lease-clauses", "fetch-reminders"]>;
export type ToolName = z.infer<typeof toolNameEnum>;
export declare const taskNodeSchema: z.ZodObject<{
    id: z.ZodString;
    toolName: z.ZodEnum<["search-portfolios", "search-properties", "list-portfolios", "fetch-lease-document", "fetch-tasks-alerts", "fetch-portfolio-overview", "fetch-property-details", "fetch-lease-evolution", "fetch-amendment-history", "fetch-risk-summary", "fetch-open-tasks", "fetch-expiring-leases", "fetch-cam-data", "fetch-lease-clauses", "fetch-reminders"]>;
    inputs: z.ZodString;
    dependsOn: z.ZodArray<z.ZodString, "many">;
    isDynamic: z.ZodBoolean;
    taskTitle: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
    inputs: string;
    dependsOn: string[];
    isDynamic: boolean;
    taskTitle: string;
}, {
    id: string;
    toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
    inputs: string;
    dependsOn: string[];
    isDynamic: boolean;
    taskTitle: string;
}>;
export type TaskNode = z.infer<typeof taskNodeSchema>;
export declare const taskResultSchema: z.ZodObject<{
    taskId: z.ZodString;
    toolName: z.ZodString;
    status: z.ZodEnum<["completed", "failed", "skipped"]>;
    output: z.ZodUnknown;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "skipped";
    toolName: string;
    taskId: string;
    error?: string | undefined;
    output?: unknown;
}, {
    status: "completed" | "failed" | "skipped";
    toolName: string;
    taskId: string;
    error?: string | undefined;
    output?: unknown;
}>;
export type TaskResult = z.infer<typeof taskResultSchema>;
export declare const uiContextSchema: z.ZodObject<{
    portfolio_id: z.ZodOptional<z.ZodString>;
    property_id: z.ZodOptional<z.ZodString>;
    lease_id: z.ZodOptional<z.ZodString>;
    active_tab: z.ZodOptional<z.ZodString>;
    focused_widget: z.ZodOptional<z.ZodString>;
    date_range: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lease_id?: string | undefined;
    portfolio_id?: string | undefined;
    property_id?: string | undefined;
    active_tab?: string | undefined;
    focused_widget?: string | undefined;
    date_range?: string | undefined;
}, {
    lease_id?: string | undefined;
    portfolio_id?: string | undefined;
    property_id?: string | undefined;
    active_tab?: string | undefined;
    focused_widget?: string | undefined;
    date_range?: string | undefined;
}>;
export type UIContext = z.infer<typeof uiContextSchema>;
export declare const dagStateSchema: z.ZodObject<{
    userRequest: z.ZodString;
    uiContext: z.ZodObject<{
        portfolio_id: z.ZodOptional<z.ZodString>;
        property_id: z.ZodOptional<z.ZodString>;
        lease_id: z.ZodOptional<z.ZodString>;
        active_tab: z.ZodOptional<z.ZodString>;
        focused_widget: z.ZodOptional<z.ZodString>;
        date_range: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lease_id?: string | undefined;
        portfolio_id?: string | undefined;
        property_id?: string | undefined;
        active_tab?: string | undefined;
        focused_widget?: string | undefined;
        date_range?: string | undefined;
    }, {
        lease_id?: string | undefined;
        portfolio_id?: string | undefined;
        property_id?: string | undefined;
        active_tab?: string | undefined;
        focused_widget?: string | undefined;
        date_range?: string | undefined;
    }>;
    recentMessages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
    }, {
        role: "user" | "assistant";
        content: string;
    }>, "many">>;
    iteration: z.ZodNumber;
    toolsUsed: z.ZodArray<z.ZodString, "many">;
    completedTasks: z.ZodArray<z.ZodObject<{
        taskId: z.ZodString;
        toolName: z.ZodString;
        status: z.ZodEnum<["completed", "failed", "skipped"]>;
        output: z.ZodUnknown;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed" | "skipped";
        toolName: string;
        taskId: string;
        error?: string | undefined;
        output?: unknown;
    }, {
        status: "completed" | "failed" | "skipped";
        toolName: string;
        taskId: string;
        error?: string | undefined;
        output?: unknown;
    }>, "many">;
    isComplete: z.ZodBoolean;
    needsUserClarification: z.ZodDefault<z.ZodBoolean>;
    artifactType: z.ZodOptional<z.ZodEnum<["text", "table", "timeline", "chart"]>>;
    taskGraph: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        toolName: z.ZodEnum<["search-portfolios", "search-properties", "list-portfolios", "fetch-lease-document", "fetch-tasks-alerts", "fetch-portfolio-overview", "fetch-property-details", "fetch-lease-evolution", "fetch-amendment-history", "fetch-risk-summary", "fetch-open-tasks", "fetch-expiring-leases", "fetch-cam-data", "fetch-lease-clauses", "fetch-reminders"]>;
        inputs: z.ZodString;
        dependsOn: z.ZodArray<z.ZodString, "many">;
        isDynamic: z.ZodBoolean;
        taskTitle: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }, {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }>, "many">>;
    orchestratorThoughts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    userRequest: string;
    uiContext: {
        lease_id?: string | undefined;
        portfolio_id?: string | undefined;
        property_id?: string | undefined;
        active_tab?: string | undefined;
        focused_widget?: string | undefined;
        date_range?: string | undefined;
    };
    recentMessages: {
        role: "user" | "assistant";
        content: string;
    }[];
    iteration: number;
    toolsUsed: string[];
    completedTasks: {
        status: "completed" | "failed" | "skipped";
        toolName: string;
        taskId: string;
        error?: string | undefined;
        output?: unknown;
    }[];
    isComplete: boolean;
    needsUserClarification: boolean;
    orchestratorThoughts: string[];
    artifactType?: "text" | "timeline" | "table" | "chart" | undefined;
    taskGraph?: {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }[] | undefined;
}, {
    userRequest: string;
    uiContext: {
        lease_id?: string | undefined;
        portfolio_id?: string | undefined;
        property_id?: string | undefined;
        active_tab?: string | undefined;
        focused_widget?: string | undefined;
        date_range?: string | undefined;
    };
    iteration: number;
    toolsUsed: string[];
    completedTasks: {
        status: "completed" | "failed" | "skipped";
        toolName: string;
        taskId: string;
        error?: string | undefined;
        output?: unknown;
    }[];
    isComplete: boolean;
    recentMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
    needsUserClarification?: boolean | undefined;
    artifactType?: "text" | "timeline" | "table" | "chart" | undefined;
    taskGraph?: {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }[] | undefined;
    orchestratorThoughts?: string[] | undefined;
}>;
export type DagState = z.infer<typeof dagStateSchema>;
export declare const orchestratorOutputSchema: z.ZodObject<{
    thought: z.ZodString;
    isComplete: z.ZodBoolean;
    needsUserClarification: z.ZodBoolean;
    artifactType: z.ZodNullable<z.ZodEnum<["text", "table", "timeline", "chart"]>>;
    taskGraph: z.ZodNullable<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        toolName: z.ZodEnum<["search-portfolios", "search-properties", "list-portfolios", "fetch-lease-document", "fetch-tasks-alerts", "fetch-portfolio-overview", "fetch-property-details", "fetch-lease-evolution", "fetch-amendment-history", "fetch-risk-summary", "fetch-open-tasks", "fetch-expiring-leases", "fetch-cam-data", "fetch-lease-clauses", "fetch-reminders"]>;
        inputs: z.ZodString;
        dependsOn: z.ZodArray<z.ZodString, "many">;
        isDynamic: z.ZodBoolean;
        taskTitle: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }, {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    isComplete: boolean;
    needsUserClarification: boolean;
    artifactType: "text" | "timeline" | "table" | "chart" | null;
    taskGraph: {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }[] | null;
    thought: string;
}, {
    isComplete: boolean;
    needsUserClarification: boolean;
    artifactType: "text" | "timeline" | "table" | "chart" | null;
    taskGraph: {
        id: string;
        toolName: "fetch-lease-document" | "fetch-tasks-alerts" | "list-portfolios" | "search-portfolios" | "search-properties" | "fetch-portfolio-overview" | "fetch-property-details" | "fetch-lease-evolution" | "fetch-amendment-history" | "fetch-risk-summary" | "fetch-open-tasks" | "fetch-expiring-leases" | "fetch-cam-data" | "fetch-lease-clauses" | "fetch-reminders";
        inputs: string;
        dependsOn: string[];
        isDynamic: boolean;
        taskTitle: string;
    }[] | null;
    thought: string;
}>;
export type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;
export declare const answeringOutputSchema: z.ZodObject<{
    answer: z.ZodString;
    citations: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        source: z.ZodEnum<["LEASE", "AMENDMENT", "TASK", "ALERT", "CALC"]>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }, {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }>, "many">;
    highlightWidgets: z.ZodArray<z.ZodString, "many">;
    suggestedFollowUps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    answer: string;
    citations: {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }[];
    highlightWidgets: string[];
    suggestedFollowUps: string[];
}, {
    answer: string;
    citations: {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }[];
    highlightWidgets: string[];
    suggestedFollowUps: string[];
}>;
export type AnsweringOutput = z.infer<typeof answeringOutputSchema>;
export declare const chatResponseSchema: z.ZodObject<{
    answer: z.ZodString;
    citations: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        source: z.ZodEnum<["LEASE", "AMENDMENT", "TASK", "ALERT", "CALC"]>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }, {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }>, "many">;
    highlightWidgets: z.ZodArray<z.ZodString, "many">;
    suggestedFollowUps: z.ZodArray<z.ZodString, "many">;
} & {
    iterationsUsed: z.ZodNumber;
    toolsUsed: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    toolsUsed: string[];
    answer: string;
    citations: {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }[];
    highlightWidgets: string[];
    suggestedFollowUps: string[];
    iterationsUsed: number;
}, {
    toolsUsed: string[];
    answer: string;
    citations: {
        text: string;
        source: "LEASE" | "AMENDMENT" | "TASK" | "ALERT" | "CALC";
    }[];
    highlightWidgets: string[];
    suggestedFollowUps: string[];
    iterationsUsed: number;
}>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
