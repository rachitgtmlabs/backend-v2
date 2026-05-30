import { z } from 'zod';
export declare const leaseWorkflowInputSchema: z.ZodObject<{
    userRequest: z.ZodString;
    uiContext: z.ZodDefault<z.ZodObject<{
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
    }>>;
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
}, {
    userRequest: string;
    uiContext?: {
        lease_id?: string | undefined;
        portfolio_id?: string | undefined;
        property_id?: string | undefined;
        active_tab?: string | undefined;
        focused_widget?: string | undefined;
        date_range?: string | undefined;
    } | undefined;
    recentMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
}>;
export declare const leaseWorkflow: import("@mastra/core/workflows").Workflow<import("@mastra/core/workflows").DefaultEngineType, import("@mastra/core/workflows").Step<string, unknown, unknown, unknown, unknown, unknown, any, unknown>[], "lease-chat-workflow", unknown, unknown, unknown, unknown, unknown>;
