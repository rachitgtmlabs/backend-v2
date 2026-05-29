import type { InvoiceResult } from './types';
export interface InvoiceLineDiff {
    billId: string;
    unit_id: string;
    original_invoice_id: string | null;
    original_invoiced_amount: number;
    canonical_invoiced_amount: number;
    delta: number;
    reason: string;
}
export interface UnitDiff {
    unit_id: string;
    actual_invoiced_total: number;
    canonical_invoiced_total: number;
    delta: number;
    actual_threshold_eoy: number;
    canonical_threshold_eoy: number;
    lines: InvoiceLineDiff[];
}
export interface ReconDiff {
    total_delta: number;
    units_with_discrepancies: number;
    bills_affected: number;
    by_unit: UnitDiff[];
}
export interface CommittedInvoiceLite {
    invoiceId: string;
    billId: string | null;
    unit_id: string;
    invoice_amount: number;
    threshold_after?: number | null;
}
export declare function diffInvoiceSets(canonical: readonly InvoiceResult[], actual: readonly CommittedInvoiceLite[]): ReconDiff;
