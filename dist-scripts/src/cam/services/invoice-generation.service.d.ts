import { Model } from 'mongoose';
import { LeaseDocumentModel } from '../../lease/schemas/lease.schema';
import { UnitDocumentModel } from '../../unit/schemas/unit.schema';
import { applyBillToUnit, type GenerateResult, type InvoiceResult } from '../engine';
import { BillDocumentModel } from '../schemas/bill.schema';
import { TenantInvoiceDocumentModel } from '../schemas/tenant-invoice.schema';
import { UnitThresholdDocumentModel } from '../schemas/unit-threshold.schema';
export declare class InvoiceGenerationService {
    private readonly billModel;
    private readonly unitModel;
    private readonly invoiceModel;
    private readonly thresholdModel;
    private readonly leaseModel;
    private readonly logger;
    constructor(billModel: Model<BillDocumentModel>, unitModel: Model<UnitDocumentModel>, invoiceModel: Model<TenantInvoiceDocumentModel>, thresholdModel: Model<UnitThresholdDocumentModel>, leaseModel: Model<LeaseDocumentModel>);
    preview(args: {
        portfolio_id: string;
        property_id: string;
        session_id?: string;
    }): Promise<{
        invoices: PreviewInvoice[];
        stats: GenerateResult['stats'];
        threshold_deltas: ThresholdDelta[];
    }>;
    commit(args: {
        portfolio_id: string;
        property_id: string;
        session_id?: string;
        actor?: string;
    }): Promise<{
        invoices: TenantInvoicePayload[];
        bills_committed: number;
        threshold_writes: number;
        stats: GenerateResult['stats'];
    }>;
    private loadInputs;
    private resolveTenantNamesForUnits;
    private markBillsCommitted;
    private toPreviewInvoice;
    private computeThresholdDeltas;
    applyBillToUnitDebug: typeof applyBillToUnit;
}
export interface PreviewInvoice extends Omit<InvoiceResult, 'is_excluded'> {
    unit_code: string | null;
    property_id: string;
    portfolio_id: string;
    is_excluded: boolean;
}
export interface ThresholdDelta {
    unit_id: string;
    calendar_year: number;
    threshold_before: number;
    threshold_after: number;
    delta: number;
}
export interface TenantInvoicePayload {
    invoiceId: string;
    unit_id: string;
    billId: string | null;
    invoice_amount: number;
    case_type: string | null;
    calendar_year: number;
}
