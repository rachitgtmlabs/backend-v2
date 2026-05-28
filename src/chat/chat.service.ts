import { Injectable, Logger } from '@nestjs/common';
import { mastra } from '../mastra';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** Enough history for search → numbered options → "pick 1" flows. */
  private static readonly CHAT_MESSAGE_WINDOW = 6;

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const { messages, context } = dto;
    const recent = messages.slice(-ChatService.CHAT_MESSAGE_WINDOW);
    const lastUser = [...recent].reverse().find((m) => m.role === 'user');
    const userRequest = lastUser?.content?.trim() ?? '';

    if (!userRequest) {
      return this.fallback('Please send a message to ask something.');
    }

    try {
      const workflow = mastra.getWorkflow('lease-chat-workflow');
      if (!workflow) {
        this.logger.error('lease-chat-workflow not registered');
        return this.fallback('Sorry, the assistant is unavailable.');
      }

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
}
