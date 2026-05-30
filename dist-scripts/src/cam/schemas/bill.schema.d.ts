import { HydratedDocument } from 'mongoose';
export type BillDocumentModel = HydratedDocument<Bill> & {
    createdAt: Date;
    updatedAt: Date;
};
export type BillStatus = 'extracted' | 'incomplete' | 'accepted' | 'rejected' | 'committed';
export declare class Bill {
    billId: string;
    portfolio_id: string;
    property_id: string;
    unit_id: string | null;
    vendor_invoice_number: string | null;
    vendor_name: string | null;
    vendor_id: string | null;
    invoice_date: Date | null;
    due_date: Date | null;
    service_period_start: Date | null;
    service_period_end: Date | null;
    total_amount: number | null;
    currency: string;
    expense_category: string | null;
    status: BillStatus;
    source_file_url: string | null;
    source_page_range: string | null;
    ocr_confidence: number | null;
    missing_fields: string[];
    additional_meta_data: Record<string, unknown>;
    session_id: string | null;
    created_by: string | null;
    accepted_by: string | null;
    accepted_at: Date | null;
}
export declare const BillSchema: import("mongoose").Schema<Bill, import("mongoose").Model<Bill, any, any, any, import("mongoose").Document<unknown, any, Bill, any, {}> & Bill & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Bill, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Bill>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Bill> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
