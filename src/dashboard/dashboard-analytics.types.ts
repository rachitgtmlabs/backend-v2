/**
 * Wire contract for `GET /v1/dashboard/analytics`. Mirrors what the frontend
 * Analytics pane needs to render — the legacy stub shape (kpis, leaseExpiry,
 * camRecovery, riskHeatmap) is no longer used by the new dashboard and is
 * being replaced by this shape end-to-end.
 *
 * Keep this file in sync with frontend-new/lib/api/dashboard-analytics.types.ts.
 */
export interface DashboardAnalyticsResponse {
  kpis: {
    /** Number of properties in scope. */
    propertyCount: number;
    /** Total units across those properties. */
    unitsCount: number;
    /** Total square footage we know about (sum of leased units' sqft from leases). */
    leasedSqft: number;
    /**
     * Portfolio-wide occupancy as a percentage (0-100). Computed from
     * `units.occupancy_status`. Returns null when no units exist.
     */
    occupancyPct: number | null;
    /**
     * Average rent per sqft (annual, weighted by sqft). USD. Returns null
     * when we can't parse rent/sqft from any lease.
     */
    avgRentPerSqftUsd: number | null;
    /**
     * Average remaining lease term in years, weighted by annual rent.
     * Returns null when no leases have parseable end dates.
     */
    avgTermLeftYears: number | null;
  };
  callouts: {
    /**
     * Leases whose end date is in the next 12 months and the sum of their
     * annual rent ("$ at stake").
     */
    expiringNext12Months: { count: number; annualRentAtStakeUsd: number };
    /**
     * Unresolved property alerts at severity >= 'high'. Both the raw count
     * and the distinct lease set affected.
     */
    highSeverityRisks: { count: number; leasesAffected: number };
    /**
     * Top-N tenant concentration: share of total annual rent contributed by
     * the top `topN` tenants.
     */
    tenantConcentration: { topN: number; sharePct: number };
  };
  /** Up to 12 leases with at least one event in the current year. */
  eventsTimeline: Array<{
    tenant: string;
    suite: string;
    propertyId: string | null;
    /** All events for this lease in the requested year, sorted by date. */
    events: Array<{
      type: 'lease_expires' | 'rent_escalation' | 'renewal_notice' | 'termination_window';
      date: string; // ISO date (YYYY-MM-DD)
      label: string; // user-facing one-liner
    }>;
  }>;
  /** Top 3 properties by annual rent contribution. */
  revenueByProperty: Array<{
    propertyId: string;
    propertyName: string;
    annualRentUsd: number;
    sharePct: number;
  }>;
  /** Top 5 tenants by annual rent contribution. */
  topTenants: Array<{
    tenant: string;
    annualRentUsd: number;
    sharePct: number;
    propertyName: string | null;
    expiresOn: string | null;
    leaseId: string;
  }>;
  /** Year the timeline + KPIs were computed against (defaults to current year). */
  asOfYear: number;
}
