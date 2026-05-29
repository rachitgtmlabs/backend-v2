import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    chat(dto: ChatRequestDto, orgId: string | undefined): Promise<ChatResponseDto>;
    chatStream(dto: ChatRequestDto, orgId: string | undefined, res: Response): Promise<void>;
}
