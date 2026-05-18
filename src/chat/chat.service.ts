import { Injectable, Logger } from '@nestjs/common';
import { mastra } from '../mastra';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** Enough history for search → numbered options → "pick 1" flows. */
  private static readonly CHAT_MESSAGE_WINDOW = 6;

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const { messages, context } = dto;

    const recentMessages = messages.slice(-ChatService.CHAT_MESSAGE_WINDOW);

    let systemMessage: string;
    
    if (context) {
      systemMessage = `The user's current lease (for tool calls only—do not repeat these IDs or say you loaded anything unless they ask):
portfolio_id=${context.portfolio_id}
property_id=${context.property_id}
lease_id=${context.lease_id}

For lease terms/clauses: call fetch-lease-document with those three values.
For tasks, alerts, or what to prioritize: call fetch-tasks-alerts with the same portfolio_id, property_id, and lease_id.
Stay casual; answer only what they asked.`;
    } else {
      systemMessage = `No lease is pre-selected. When they name a portfolio, use search-portfolios first; use list-portfolios to browse or if search finds nothing. Then search-properties and fetch-lease-document / fetch-tasks-alerts as needed. If several portfolios or properties match, list numbered options and wait for their choice before assuming. Keep replies casual—no internal IDs or "I fetched" talk unless they ask.`;
    }

    const formattedMessages: Message[] = [
      { role: 'system', content: systemMessage },
      ...recentMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    try {
      const agent = mastra.getAgentById('lease-qa-agent');

      if (!agent) {
        this.logger.error('Lease agent not found');
        return { response: 'Sorry, the assistant is currently unavailable.' };
      }

      const result = await agent.generate(formattedMessages);

      return { response: result.text || 'I could not generate a response.' };
    } catch (error) {
      this.logger.error('Chat generation failed', error);
      return {
        response:
          'Sorry, I encountered an error while processing your request. Please try again.',
      };
    }
  }
}
