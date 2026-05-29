import { HydratedDocument } from 'mongoose';
export type ReconciliationRunDocumentModel = HydratedDocument<ReconciliationRun> & {
    createdAt: Date;
    updatedAt: Date;
};
export type ReconciliationRunMode = 'preview' | 'applied';
export declare class ReconUnitSnapshot {
    unit_id: string;
    unit_code: string | null;
    tenant_name: string | null;
    actual_invoiced_total: number;
    canonical_invoiced_total: number;
    delta: number;
    actual_threshold_eoy: number;
    canonical_threshold_eoy: number;
    adjustment_invoiceId: string | null;
}
export declare class ReconciliationRun {
    runId: string;
    property_id: string;
    portfolio_id: string;
    unit_id: string | null;
    calendar_year: number;
    mode: ReconciliationRunMode;
    triggered_by: string;
    triggered_at: Date;
    total_delta: number;
    units_with_discrepancies: number;
    bills_affected: number;
    by_unit: ReconUnitSnapshot[];
    adjustments_created: string[];
    applied_at: Date | null;
    applied_by: string | null;
    apply_reason: string | null;
}
export declare const ReconciliationRunSchema: import("mongoose").Schema<ReconciliationRun, import("mongoose").Model<ReconciliationRun, any, any, any, import("mongoose").Document<unknown, any, ReconciliationRun, any, {}> & ReconciliationRun & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReconciliationRun, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ReconciliationRun>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ReconciliationRun> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
