/**
 * Discriminated-union of every event the chat stream emits to the frontend.
 * One JSON object per NDJSON line on `POST /v1/chat/stream`.
 *
 * Keep this file in sync with the matching `ChatStreamEvent` type on the
 * frontend (frontend-new/lib/api/chat-stream.types.ts). The shape is the
 * wire contract — adding optional fields is fine, renaming is not.
 */
export type ChatStreamEvent =
  | {
      type: 'status';
      stage: 'planning' | 'answering';
      state: 'started' | 'completed';
      /** One-line summary the orchestrator wrote (e.g. "Looking up Apex Tower"). Only on stage=planning state=completed. */
      thought?: string;
      iteration?: number;
    }
  | {
      type: 'tool_started';
      taskId: string;
      toolName: string;
      /** 3-6 word user-facing label the orchestrator generated. */
      taskTitle: string;
    }
  | {
      type: 'tool_completed';
      taskId: string;
      toolName: string;
      status: 'completed' | 'failed' | 'skipped';
      durationMs: number;
      /** Short error reason when status != 'completed'. */
      error?: string;
    }
  | {
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
    }
  | {
      type: 'error';
      message: string;
    };

/**
 * Stable event-type discriminators used on both Mastra `writer.write()`
 * calls and the wire payload. Centralised so a typo can't slip past
 * TypeScript checks.
 */
export const CHAT_STREAM_EVENT_TYPES = {
  STATUS: 'status',
  TOOL_STARTED: 'tool_started',
  TOOL_COMPLETED: 'tool_completed',
  FINAL: 'final',
  ERROR: 'error',
} as const;
