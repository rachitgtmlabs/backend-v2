declare class MessageDto {
    role: 'user' | 'assistant';
    content: string;
}
declare class ContextDto {
    portfolio_id?: string;
    property_id?: string;
    lease_id?: string;
    active_tab?: string;
    focused_widget?: string;
    date_range?: string;
}
export declare class ChatRequestDto {
    messages: MessageDto[];
    context?: ContextDto;
}
export declare class CitationDto {
    text: string;
    source: 'LEASE' | 'AMENDMENT' | 'TASK' | 'ALERT' | 'CALC';
}
export declare class ChatResponseDto {
    answer: string;
    citations: CitationDto[];
    highlightWidgets: string[];
    suggestedFollowUps: string[];
    iterationsUsed: number;
    toolsUsed: string[];
    response: string;
}
export {};
