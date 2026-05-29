export declare class RecordPaymentDto {
    portfolio_id: string;
    amount: number;
    paid_at: string;
    method?: string;
    reference?: string;
    notes?: string;
    actor?: string;
}
export declare class CreateReminderDto {
    portfolio_id: string;
    user_id: string;
    remind_at: string;
    note?: string;
    channel?: 'in_app' | 'email' | 'both';
}
export declare class DeleteReminderDto {
    portfolio_id: string;
    user_id: string;
}
