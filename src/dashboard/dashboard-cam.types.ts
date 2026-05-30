/**
 * Wire contract for `GET /v1/dashboard/cam` — feeds the CAM Recoveries tab on
 * the dashboard. Mirror to keep in sync with
 * frontend-new/lib/api/dashboard-cam.types.ts.
 *
 * The shape is computed entirely from `tenant_invoices`, `reconciliation_runs`,
 * `property_alerts`, and `properties` (all org-scoped). No external billing
 * system needed.
 */
export interface DashboardCamResponse {
  /** Calendar year the figures are computed against. */
  asOfYear: number;

  kpis: {
    /** Billed + still-recoverable for the year. Caller's best estimate of
     * what the portfolio was entitled to bill. */
    totalBillableThisYearUsd: number;
    /** Sum of committed tenant_invoices.invoice_amount in `asOfYear`. */
    alreadyBilledThisYearUsd: number;
    /** alreadyBilled / totalBillable * 100, 0..100. */
    billedSharePct: number;
    /** Sum of positive `total_delta` across preview reconciliation_runs in
     * `asOfYear` — money the audit found wasn't billed. */
    stillRecoverableUsd: number;
    /** Distinct unit ids where preview reconciliation found a positive delta. */
    leasesAffectedByRecoverable: number;
    /** Sum over committed invoices of (invoice_amount - tenant_paid_amount)
     * older than 30 days. */
    outstandingFromTenantsUsd: number;
    /** Count of invoices contributing to outstandingFromTenantsUsd. */
    outstandingFromTenantsCount: number;
  };

  /**
   * Breakdown of billed revenue by `expense_category`. The frontend renders
   * one row per category sorted by amount descending. Adjustment invoices
   * (no category) are grouped under "Adjustments".
   */
  revenueByType: Array<{
    category: string;
    billedUsd: number;
    sharePct: number;
    /** Invoice count contributing to this bucket — useful sub-label. */
    invoiceCount: number;
  }>;

  /**
   * "Where money is being left on the table" list. Mix of:
   *  - Under-billed: positive total_delta from preview reconciliation runs
   *    (each property/year run becomes one row).
   *  - Cap-approaching / audit-window: relevant property alerts where the
   *    alert_type contains 'cam' / 'opex'.
   */
  moneyOnTheTable: Array<{
    kind: 'under_billed' | 'cam_alert';
    title: string;
    sub: string;
    amountUsd?: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    propertyId?: string;
  }>;

  /**
   * Per-property progress: how much of the year's CAM-related billable
   * has actually been invoiced. `billedUsd / billableUsd` drives the bar.
   */
  camByProperty: Array<{
    propertyId: string;
    propertyName: string;
    billedUsd: number;
    billableUsd: number;
    leftUsd: number;
    sharePct: number;
  }>;

  /** Portfolio-wide donut: billed / billable. */
  camRecoveryRate: {
    billedUsd: number;
    billableUsd: number;
    ratePct: number;
  };

  /** CAM-specific risks pulled from property_alerts (alert_type matches
   * /cam|opex/) or by-title fallback. */
  camRisks: Array<{
    itemId: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    details: string;
    propertyId?: string;
  }>;
}
