import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { CurrentOrgId } from '../auth/decorators/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Single-shot JSON variant — kept for any caller that doesn't need progress. */
  @Post()
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentOrgId() orgId: string | undefined,
  ): Promise<ChatResponseDto> {
    return this.chatService.chat(dto, orgId);
  }

  /**
   * NDJSON streaming variant. Emits one ChatStreamEvent JSON object per line:
   *   {"type":"status","stage":"planning","state":"started",...}
   *   {"type":"tool_started","taskId":"t1","toolName":"search-properties",...}
   *   {"type":"tool_completed",...}
   *   ...
   *   {"type":"final","answer":"...","citations":[...]}
   *
   * The frontend chat UI streams these to render progress as the agent works.
   */
  @Post('stream')
  async chatStream(
    @Body() dto: ChatRequestDto,
    @CurrentOrgId() orgId: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    await this.chatService.streamChat(dto, orgId, res);
  }
}
