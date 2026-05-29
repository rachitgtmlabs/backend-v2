import { HydratedDocument } from 'mongoose';
export type TenantInvoiceDocumentModel = HydratedDocument<TenantInvoice> & {
    createdAt: Date;
    updatedAt: Date;
};
export type TenantInvoiceKind = 'original' | 'adjustment';
export type TenantInvoiceCaseType = 'excluded' | 'pre_base' | 'crossover' | 'post_base';
export type TenantInvoiceStatus = 'draft' | 'pending_review' | 'committed' | 'void';
export type VarianceTag = 'compliant' | 'over_billed' | 'under_billed';
export declare class PaymentEntry {
    amount: number;
    paid_at: Date;
    method: string | null;
    reference: string | null;
    notes: string | null;
    recorded_by: string;
    recorded_at: Date;
}
export declare class InvoiceReminder {
    reminder_id: string;
    user_id: string;
    remind_at: Date;
    note: string;
    channel: string;
    fired_at: Date | null;
}
export declare class AdjustmentLineItem {
    billId: string;
    bill_vendor_name: string | null;
    bill_invoice_date: Date | null;
    bill_total_amount: number | null;
    original_invoice_id: string | null;
    original_invoiced_amount: number;
    canonical_invoiced_amount: number;
    delta: number;
    reason: string;
}
export declare class TenantInvoice {
    invoiceId: string;
    invoice_kind: TenantInvoiceKind;
    billId: string | null;
    unit_id: string;
    property_id: string;
    portfolio_id: string;
    unit_code: string | null;
    tenant_name: string | null;
    bill_amount: number | null;
    share_pct: number | null;
    base_amount_at_time: number | null;
    base_year_at_time: number | null;
    admin_fee_pct_at_time: number | null;
    threshold_before: number | null;
    threshold_after: number | null;
    under_base_portion: number;
    over_base_portion: number;
    admin_fee: number;
    invoice_amount: number;
    case_type: TenantInvoiceCaseType | null;
    calendar_year: number;
    expense_category: string | null;
    applied_cam_rule_ids: string[];
    status: TenantInvoiceStatus;
    committed_at: Date | null;
    committed_by: string | null;
    tenant_paid_amount: number | null;
    variance_tag: VarianceTag | null;
    payment_history: PaymentEntry[];
    reminders: InvoiceReminder[];
    reconciliation_runId: string | null;
    line_items?: AdjustmentLineItem[];
}
export declare const TenantInvoiceSchema: import("mongoose").Schema<TenantInvoice, import("mongoose").Model<TenantInvoice, any, any, any, import("mongoose").Document<unknown, any, TenantInvoice, any, {}> & TenantInvoice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TenantInvoice, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<TenantInvoice>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<TenantInvoice> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
