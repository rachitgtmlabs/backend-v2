/**
 * CAM engine types — pure data shapes, no Mongoose dependencies.
 *
 * The engine is intentionally storage-agnostic: it takes plain inputs,
 * produces plain outputs. The service layer (Phase 3) is what reads from
 * Mongo, calls the engine, and writes the results back.
 *
 * Field names mirror the snake_case used in the schemas so the service
 * adapter is a 1:1 spread. Reduces a class of "I forgot to map this
 * field" bugs.
 */

/**
 * The four cases the engine can take per (bill, unit). Matches
 * TenantInvoice.case_type and the UX's caseType label.
 */
export type CaseType = 'excluded' | 'pre_base' | 'crossover' | 'post_base';

/**
 * Per-unit CAM allocation. The same shape as Unit.cam_allocation, but as a
 * plain interface so the engine can be called from tests without spinning
 * up Mongoose.
 */
export interface CamAllocationInput {
  base_amount: number;
  base_year: number;
  share_pct: number;
  exclusions: string[];
  admin_fee_pct?: number | null;
  rule_ids?: string[];
  rule_name?: string;
}

/** Minimal bill shape the engine cares about. */
export interface BillInput {
  billId: string;
  total_amount: number;
  expense_category: string | null;
  /**
   * Calendar year this bill belongs to — driven by invoice_date or
   * service_period_start; the caller decides which. The engine just
   * uses it to key into the thresholds map.
   */
  calendar_year: number;
  /**
   * Used only by the replay variant for stable chronological ordering.
   * Optional in the streaming variant (where arrival order = ingestion
   * order, which the user has accepted is intentionally non-canonical).
   */
  service_period_start?: Date | string | null;
}

/** Minimal unit shape — what the engine needs to allocate a bill. */
export interface UnitInput {
  unit_id: string;
  unit_code?: string | null;
  tenant_name?: string | null;
  /** 'occupied' units allocate; 'vacant' units are skipped entirely. */
  occupancy_status: 'occupied' | 'vacant';
  /**
   * Null = "skip this unit, not configured yet" (same effect as vacant).
   * Provided = run the algorithm against these params.
   */
  cam_allocation: CamAllocationInput | null;
}

/**
 * What the engine produces for a single (bill, unit) pair. The service
 * layer spreads this onto a TenantInvoice document. Fields match the
 * schema 1:1 so spreading is safe.
 */
export interface InvoiceResult {
  /** Same key the bill came in with. */
  billId: string;
  unit_id: string;
  case_type: CaseType;
  calendar_year: number;

  // Engine inputs snapshotted for audit
  bill_amount: number;
  share_pct: number;
  base_amount_at_time: number;
  base_year_at_time: number;
  admin_fee_pct_at_time: number | null;

  // Threshold state
  threshold_before: number;
  threshold_after: number;

  // Math breakdown
  under_base_portion: number;
  over_base_portion: number;
  admin_fee: number;
  invoice_amount: number;

  // Category + rule citations (from inputs, but copied for stability)
  expense_category: string | null;
  applied_cam_rule_ids: string[];

  /** True when bill's category is in unit's exclusions list. */
  is_excluded: boolean;
}

/**
 * Input batch for the orchestrator. The threshold map carries running
 * state across bills; the caller persists it back to `unit_thresholds`
 * after the batch.
 *
 * Key format: `${unit_id}-${calendar_year}`. Same format as the UX's
 * unit_thresholds_initial in cam-data.jsx.
 */
export type ThresholdMap = Record<string, number>;

export function thresholdKey(unitId: string, calendarYear: number): string {
  return `${unitId}-${calendarYear}`;
}

/**
 * Whether the orchestrator should sort bills before processing.
 * 'as-given' is the streaming variant (Story 16); 'chronological' is
 * the Reconcile YYYY replay variant.
 */
export type BillOrdering = 'as-given' | 'chronological';

export interface GenerateOptions {
  ordering?: BillOrdering;
  /**
   * Initial per-(unit,year) thresholds. Defaults to {} (everyone starts
   * at 0). The streaming variant supplies the persisted thresholds; the
   * replay variant always uses {} regardless of what's passed.
   */
  initial_thresholds?: ThresholdMap;
  /**
   * Idempotency: if a (billId, unit_id, year) tuple already appears here,
   * skip it. Lets the service layer guard against double-counting on retry.
   */
  applied_bill_ids?: ReadonlySet<string>;
}

export interface GenerateResult {
  invoices: InvoiceResult[];
  /** Final per-(unit,year) thresholds after applying every bill. */
  final_thresholds: ThresholdMap;
  /** Counts for diagnostics. */
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
