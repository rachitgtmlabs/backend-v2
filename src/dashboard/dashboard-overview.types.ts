/**
 * Wire contract for `GET /v1/dashboard/overview` — feeds the Operational
 * Overview tab. Bundles the bits that would otherwise need 4+ round-trips
 * (risk summary, open tasks, reminders, CAM aggregates, invoice timeline).
 *
 * Mirror in sync with frontend-new/lib/api/dashboard-overview.types.ts.
 *
 * The Executive Overview's narrative briefings are deliberately NOT included
 * here — they belong to a separate AI-insights feature (scheduled LLM run +
 * cache) and shouldn't piggyback on this response.
 */
export interface DashboardOverviewResponse {
  asOfYear: number;
  /** ISO date the response was computed (UTC). */
  asOfDate: string;

  /**
   * Deterministic, non-LLM "daily briefing" stats. The frontend renders a
   * short factual sentence — no model required. The future AI-driven daily
   * briefing will sit alongside, not replace, this card.
   */
  briefing: {
    /** Total processed leases under the caller's org/scope. */
    leasesChecked: number;
    /** Units across those properties (companion stat to leasesChecked). */
    unitsCovered: number;
    /**
     * Newly-recoverable CAM dollars (sum of positive deltas in preview
     * reconciliation_runs for the current year that haven't been applied).
     */
    newRecoverableUsd: number;
    /** Open critical + high alerts needing attention today. */
    needsAttentionCount: number;
  };

  /**
   * The single highest-priority open alert. Null when none open. Drives the
   * "Biggest risk this week" callout.
   */
  biggestRisk: {
    itemId: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    propertyId: string;
    propertyName: string;
    leaseId: string | null;
    details: string;
    suggestedAction: string | null;
  } | null;

  /**
   * Right-hand sidebar card under the biggest-risk callout. Total open tasks
   * + a coarse breakdown. We don't have a typed `task_kind` field yet, so the
   * breakdown is keyword-based and approximate — accurate enough for an MVP.
   */
  actionsThisWeek: {
    totalCount: number;
    breakdown: { bills: number; renewals: number; other: number };
  };

  /** Three "What needs your attention" KPI cards. */
  attentionCards: {
    underBilledUsd: number;
    risks: { high: number; medium: number };
    deadlinesThisQuarter: number;
  };

  /**
   * CAM invoice vs payment trend, bucketed by month for the current year.
   * Twelve entries, Jan..Dec, each with both amounts (zero when no
   * activity). Drives the "Money trend this year" line chart.
   *
   * Note: this is CAM-specific (sum over tenant_invoices), not base rent —
   * base rent collection isn't tracked in our system. The chart subtitle
   * should reflect that.
   */
  moneyTrend: {
    months: Array<{
      month: string; // "Jan", "Feb", …
      invoicedUsd: number;
      paidUsd: number;
    }>;
    ytdInvoicedUsd: number;
    ytdPaidUsd: number;
    gapUsd: number;
    gapPct: number;
  };

  /**
   * "Do this week" list — top open tasks sorted by severity, then by due date.
   * `dueLabel` is human-readable ("Today", "May 25", "This week").
   */
  doThisWeek: Array<{
    itemId: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    propertyName: string | null;
    propertyId: string | null;
    leaseId: string | null;
    dueLabel: string;
    details: string;
  }>;
}
