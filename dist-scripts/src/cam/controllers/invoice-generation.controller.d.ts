import { CommitInvoicesDto, GenerateInvoicesDto } from '../dto/generate-invoices.dto';
import { InvoiceGenerationService } from '../services/invoice-generation.service';
export declare class InvoiceGenerationController {
    private readonly svc;
    constructor(svc: InvoiceGenerationService);
    generate(dto: GenerateInvoicesDto): Promise<{
        invoices: import("../services/invoice-generation.service").PreviewInvoice[];
        stats: import("../engine").GenerateResult["stats"];
        threshold_deltas: import("../services/invoice-generation.service").ThresholdDelta[];
    }>;
    commit(dto: CommitInvoicesDto): Promise<{
        invoices: import("../services/invoice-generation.service").TenantInvoicePayload[];
        bills_committed: number;
        threshold_writes: number;
        stats: import("../engine").GenerateResult["stats"];
    }>;
}
