import { Model } from 'mongoose';
import { CreateReminderDto, RecordPaymentDto } from '../dto/invoice-actions.dto';
import { TenantInvoiceDocumentModel, TenantInvoiceKind, VarianceTag } from '../schemas/tenant-invoice.schema';
export declare class TenantInvoicesService {
    private readonly model;
    constructor(model: Model<TenantInvoiceDocumentModel>);
    list(filter: {
        portfolio_id: string;
        property_id?: string;
        unit_id?: string;
        calendar_year?: number;
        vendor_name?: string;
        expense_category?: string;
        variance_tag?: VarianceTag;
        invoice_kind?: TenantInvoiceKind;
        reconciled?: boolean;
        limit?: number;
    }): Promise<Record<string, any>[]>;
    getOne(portfolioId: string, invoiceId: string): Promise<Record<string, any>>;
    recordPayment(invoiceId: string, dto: RecordPaymentDto, actorFromCtx?: string): Promise<Record<string, any>>;
    addReminder(invoiceId: string, dto: CreateReminderDto): Promise<Record<string, any>>;
    deleteReminder(invoiceId: string, reminderId: string, portfolioId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    findDueReminders(now?: Date, limit?: number): Promise<{
        invoiceId: string;
        reminder: {
            reminder_id: string;
            user_id: string;
            remind_at: Date;
            note: string;
            channel: string;
        };
        tenant_name: string | null;
        unit_id: string;
    }[]>;
    markReminderFired(invoiceId: string, reminderId: string): Promise<void>;
}
