export type ChatStreamEvent = {
    type: 'status';
    stage: 'planning' | 'answering';
    state: 'started' | 'completed';
    thought?: string;
    iteration?: number;
} | {
    type: 'tool_started';
    taskId: string;
    toolName: string;
    taskTitle: string;
} | {
    type: 'tool_completed';
    taskId: string;
    toolName: string;
    status: 'completed' | 'failed' | 'skipped';
    durationMs: number;
    error?: string;
} | {
    type: 'final';
    answer: string;
    citations: Array<{
        text: string;
        source: 'LEASE' | 'AMENDMENT' | 'TASK' | 'ALERT' | 'CALC';
    }>;
    highlightWidgets: string[];
    suggestedFollowUps: string[];
    iterationsUsed: number;
    toolsUsed: string[];
} | {
    type: 'error';
    message: string;
};
export declare const CHAT_STREAM_EVENT_TYPES: {
    readonly STATUS: "status";
    readonly TOOL_STARTED: "tool_started";
    readonly TOOL_COMPLETED: "tool_completed";
    readonly FINAL: "final";
    readonly ERROR: "error";
};
