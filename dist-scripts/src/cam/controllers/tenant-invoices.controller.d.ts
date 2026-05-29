import { CreateReminderDto, DeleteReminderDto, RecordPaymentDto } from '../dto/invoice-actions.dto';
import { TenantInvoiceKind, VarianceTag } from '../schemas/tenant-invoice.schema';
import { TenantInvoicesService } from '../services/tenant-invoices.service';
export declare class TenantInvoicesController {
    private readonly svc;
    constructor(svc: TenantInvoicesService);
    list(portfolioId: string | undefined, propertyId: string | undefined, unitId: string | undefined, year: string | undefined, category: string | undefined, variance: VarianceTag | undefined, kind: TenantInvoiceKind | undefined, reconciled: string | undefined, limit: string | undefined): Promise<Record<string, any>[]>;
    getOne(invoiceId: string, portfolioId: string | undefined): Promise<Record<string, any>>;
    recordPayment(invoiceId: string, dto: RecordPaymentDto): Promise<Record<string, any>>;
    addReminder(invoiceId: string, dto: CreateReminderDto): Promise<Record<string, any>>;
    deleteReminder(invoiceId: string, reminderId: string, dto: DeleteReminderDto): Promise<{
        ok: boolean;
    }>;
}
