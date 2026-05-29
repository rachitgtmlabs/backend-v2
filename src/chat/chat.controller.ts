import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { CurrentOrgId } from '../auth/decorators/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentOrgId() orgId: string | undefined,
  ): Promise<ChatResponseDto> {
    return this.chatService.chat(dto, orgId);
  }
}
