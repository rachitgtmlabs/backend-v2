export type CaseType = 'excluded' | 'pre_base' | 'crossover' | 'post_base';
export interface CamAllocationInput {
    base_amount: number;
    base_year: number;
    share_pct: number;
    exclusions: string[];
    admin_fee_pct?: number | null;
    rule_ids?: string[];
    rule_name?: string;
}
export interface BillInput {
    billId: string;
    total_amount: number;
    expense_category: string | null;
    calendar_year: number;
    service_period_start?: Date | string | null;
}
export interface UnitInput {
    unit_id: string;
    unit_code?: string | null;
    tenant_name?: string | null;
    occupancy_status: 'occupied' | 'vacant';
    cam_allocation: CamAllocationInput | null;
}
export interface InvoiceResult {
    billId: string;
    unit_id: string;
    case_type: CaseType;
    calendar_year: number;
    bill_amount: number;
    share_pct: number;
    base_amount_at_time: number;
    base_year_at_time: number;
    admin_fee_pct_at_time: number | null;
    threshold_before: number;
    threshold_after: number;
    under_base_portion: number;
    over_base_portion: number;
    admin_fee: number;
    invoice_amount: number;
    expense_category: string | null;
    applied_cam_rule_ids: string[];
    is_excluded: boolean;
}
export type ThresholdMap = Record<string, number>;
export declare function thresholdKey(unitId: string, calendarYear: number): string;
export type BillOrdering = 'as-given' | 'chronological';
export interface GenerateOptions {
    ordering?: BillOrdering;
    initial_thresholds?: ThresholdMap;
    applied_bill_ids?: ReadonlySet<string>;
}
export interface GenerateResult {
    invoices: InvoiceResult[];
    final_thresholds: ThresholdMap;
    stats: {
        bills_processed: number;
        bills_skipped: number;
        units_processed: number;
        invoices_produced: number;
        invoices_with_billable_gt_zero: number;
        invoices_excluded: number;
        invoices_crossover: number;
    };
}
