import type { Response } from 'express';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
export declare class ChatService {
    private readonly logger;
    private static readonly CHAT_MESSAGE_WINDOW;
    chat(dto: ChatRequestDto, orgId: string | undefined): Promise<ChatResponseDto>;
    private fallback;
    streamChat(dto: ChatRequestDto, orgId: string | undefined, res: Response): Promise<void>;
    private writeFinal;
}
