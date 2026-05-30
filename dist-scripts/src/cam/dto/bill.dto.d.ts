declare const BILL_STATUSES: readonly ["extracted", "incomplete", "accepted", "rejected"];
type BillStatusInput = (typeof BILL_STATUSES)[number];
export declare class CreateBillDto {
    portfolio_id: string;
    property_id: string;
    unit_id?: string;
    vendor_invoice_number?: string;
    vendor_name?: string;
    vendor_id?: string;
    invoice_date?: string;
    due_date?: string;
    service_period_start?: string;
    service_period_end?: string;
    total_amount?: number;
    currency?: string;
    expense_category?: string;
    source_file_url?: string;
    source_page_range?: string;
    ocr_confidence?: number;
    additional_meta_data?: Record<string, unknown>;
    session_id?: string;
    status?: BillStatusInput;
}
export declare class UpdateBillDto {
    vendor_invoice_number?: string;
    vendor_name?: string;
    vendor_id?: string;
    invoice_date?: string;
    due_date?: string;
    service_period_start?: string;
    service_period_end?: string;
    total_amount?: number;
    currency?: string;
    expense_category?: string;
    unit_id?: string;
    additional_meta_data?: Record<string, unknown>;
}
export declare class TransitionBillDto {
    to: 'accepted' | 'rejected';
    note?: string;
    actor?: string;
}
export declare const COMPULSORY_BILL_FIELDS: readonly ["vendor_name", "invoice_date", "total_amount", "expense_category"];
export {};
