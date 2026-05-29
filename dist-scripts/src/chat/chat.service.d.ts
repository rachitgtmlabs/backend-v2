import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
export declare class ChatService {
    private readonly logger;
    private static readonly CHAT_MESSAGE_WINDOW;
    chat(dto: ChatRequestDto): Promise<ChatResponseDto>;
    private fallback;
}
