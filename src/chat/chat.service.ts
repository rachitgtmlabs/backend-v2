import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { RequestContext } from '@mastra/core/request-context';
import { mastra } from '../mastra';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { RBAC_ORG_ID_KEY } from '../mastra/lib/rbac';
import type { ChatStreamEvent } from './chat-stream.types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** Enough history for search → numbered options → "pick 1" flows. */
  private static readonly CHAT_MESSAGE_WINDOW = 6;

  async chat(
    dto: ChatRequestDto,
    orgId: string | undefined,
  ): Promise<ChatResponseDto> {
    const { messages, context } = dto;
    const recent = messages.slice(-ChatService.CHAT_MESSAGE_WINDOW);
    const lastUser = [...recent].reverse().find((m) => m.role === 'user');
    const userRequest = lastUser?.content?.trim() ?? '';

    if (!userRequest) {
      return this.fallback('Please send a message to ask something.');
    }

    // Fail-closed: no org context means no data. Mirrors the REST API's
    // `orgFilter` policy (an orgless caller matches nothing).
    if (!orgId) {
      return this.fallback(
        'I could not verify your account. Please sign in again.',
      );
    }

    try {
      const workflow = mastra.getWorkflow('lease-chat-workflow');
      if (!workflow) {
        this.logger.error('lease-chat-workflow not registered');
        return this.fallback('Sorry, the assistant is unavailable.');
      }

      // RBAC scope flows on Mastra's RequestContext, NOT through the input
      // data. This is the same channel Mastra uses for any per-request value
      // (auth, locale, feature flags). Tools read it from
      // `context.requestContext.get(RBAC_ORG_ID_KEY)` and fail closed if missing.
      const requestContext = new RequestContext();
      requestContext.set(RBAC_ORG_ID_KEY, orgId);

      const run = await workflow.createRun();
      const result = await run.start({
        inputData: {
          userRequest,
          uiContext: context ?? {},
          recentMessages: recent.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        requestContext,
      });

      if (result.status !== 'success') {
        this.logger.warn(`Workflow finished with status=${result.status}`);
        return this.fallback(
          'I could not complete that request. Please try again.',
        );
      }

      const out = result.result as {
        answer: string;
        citations?: ChatResponseDto['citations'];
        highlightWidgets?: string[];
        suggestedFollowUps?: string[];
        iterationsUsed?: number;
        toolsUsed?: string[];
      };

      return {
        answer: out.answer,
        citations: out.citations ?? [],
        highlightWidgets: out.highlightWidgets ?? [],
        suggestedFollowUps: out.suggestedFollowUps ?? [],
        iterationsUsed: out.iterationsUsed ?? 0,
        toolsUsed: out.toolsUsed ?? [],
        response: out.answer,
      };
    } catch (error) {
      this.logger.error('Chat workflow failed', error as Error);
      return this.fallback(
        'Sorry, I encountered an error while processing your request. Please try again.',
      );
    }
  }

  private fallback(message: string): ChatResponseDto {
    return {
      answer: message,
      citations: [],
      highlightWidgets: [],
      suggestedFollowUps: [],
      iterationsUsed: 0,
      toolsUsed: [],
      response: message,
    };
  }

  /**
   * Streaming variant: same workflow, but writes one ChatStreamEvent per
   * NDJSON line to the HTTP response as events fire. Used by
   * POST /v1/chat/stream so the UI can show "Looking up Apex Tower…",
   * "Loading reconciliation runs…", etc., while the agent works.
   *
   * Wire shape: each chunk is a single JSON object terminated by '\n'.
   * Final structured payload arrives as `{type:'final', ...}`. After that,
   * the response is closed.
   */
  async streamChat(
    dto: ChatRequestDto,
    orgId: string | undefined,
    res: Response,
  ): Promise<void> {
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.socket?.setNoDelay(true);

    const write = (event: ChatStreamEvent) => {
      try {
        res.write(JSON.stringify(event) + '\n');
        (res as Response & { flush?: () => void }).flush?.();
      } catch {
        /* client may have closed — ignore */
      }
    };

    const { messages, context } = dto;
    const recent = messages.slice(-ChatService.CHAT_MESSAGE_WINDOW);
    const lastUser = [...recent].reverse().find((m) => m.role === 'user');
    const userRequest = lastUser?.content?.trim() ?? '';

    if (!userRequest) {
      this.writeFinal(write, 'Please send a message to ask something.');
      res.end();
      return;
    }

    if (!orgId) {
      this.writeFinal(
        write,
        'I could not verify your account. Please sign in again.',
      );
      res.end();
      return;
    }

    const workflow = mastra.getWorkflow('lease-chat-workflow');
    if (!workflow) {
      this.logger.error('lease-chat-workflow not registered');
      this.writeFinal(write, 'Sorry, the assistant is unavailable.');
      res.end();
      return;
    }

    const requestContext = new RequestContext();
    requestContext.set(RBAC_ORG_ID_KEY, orgId);

    let finalEmitted = false;

    try {
      const run = await workflow.createRun();
      const stream = run.stream({
        inputData: {
          userRequest,
          uiContext: context ?? {},
          recentMessages: recent.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        requestContext,
      });

      // run.stream() returns a WorkflowRunOutput whose fullStream emits both
      // Mastra-internal events (step-start, step-end, etc.) AND the custom
      // events our steps push via writer.write(). We forward only the events
      // matching our ChatStreamEvent union — everything else gets dropped.
      for await (const chunk of stream.fullStream as AsyncIterable<unknown>) {
        const event = extractChatStreamEvent(chunk);
        if (!event) continue;
        write(event);
        if (event.type === 'final') finalEmitted = true;
      }

      // If the workflow ended without our `final` event (shouldn't happen, but
      // defensive), pull the result and synthesize one so the client never
      // hangs waiting for the closing payload.
      if (!finalEmitted) {
        const final = await stream.result;
        if (final.status === 'success') {
          const out = (final as { result?: unknown }).result as {
            answer?: string;
            citations?: ChatResponseDto['citations'];
            highlightWidgets?: string[];
            suggestedFollowUps?: string[];
            iterationsUsed?: number;
            toolsUsed?: string[];
          };
          write({
            type: 'final',
            answer:
              out?.answer ??
              'I could not put together a response. Please try again.',
            citations: out?.citations ?? [],
            highlightWidgets: out?.highlightWidgets ?? [],
            suggestedFollowUps: out?.suggestedFollowUps ?? [],
            iterationsUsed: out?.iterationsUsed ?? 0,
            toolsUsed: out?.toolsUsed ?? [],
          });
        } else {
          this.logger.warn(
            `Workflow finished with status=${final.status} — emitting fallback`,
          );
          this.writeFinal(
            write,
            'I could not complete that request. Please try again.',
          );
        }
      }
    } catch (error) {
      this.logger.error('Chat stream failed', error as Error);
      write({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected streaming error.',
      });
      if (!finalEmitted) {
        this.writeFinal(
          write,
          'Sorry, I encountered an error while processing your request. Please try again.',
        );
      }
    } finally {
      res.end();
    }
  }

  private writeFinal(
    write: (event: ChatStreamEvent) => void,
    message: string,
  ): void {
    write({
      type: 'final',
      answer: message,
      citations: [],
      highlightWidgets: [],
      suggestedFollowUps: [],
      iterationsUsed: 0,
      toolsUsed: [],
    });
  }
}

/**
 * The workflow's fullStream emits a tagged-union of Mastra-internal events
 * and our custom writer.write() chunks. The custom chunks may arrive raw
 * (`{type:'tool_started', ...}`) or wrapped (`{type:'tool-output', payload:{...}}`)
 * depending on Mastra's chunk envelope. We accept either shape and reject
 * anything that isn't part of our ChatStreamEvent union.
 */
function extractChatStreamEvent(chunk: unknown): ChatStreamEvent | null {
  if (!chunk || typeof chunk !== 'object') return null;
  const c = chunk as Record<string, unknown>;

  if (isChatEventType(c.type)) return c as unknown as ChatStreamEvent;

  // Mastra wraps custom writer.write() chunks under `payload` for the
  // standard 'tool-output' chunk type. Unwrap if needed.
  const payload = c.payload as Record<string, unknown> | undefined;
  if (payload && isChatEventType(payload.type)) {
    return payload as unknown as ChatStreamEvent;
  }

  return null;
}

function isChatEventType(value: unknown): boolean {
  return (
    value === 'status' ||
    value === 'tool_started' ||
    value === 'tool_completed' ||
    value === 'final' ||
    value === 'error'
  );
}
