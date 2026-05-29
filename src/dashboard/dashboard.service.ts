import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from '../property/schemas/property.schema';
import { Lease } from '../lease/schemas/lease.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { PropertyAlert } from '../tasks-alerts/schemas/property-alert.schema';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { Unit } from '../unit/schemas/unit.schema';
import { TenantInvoice } from '../cam/schemas/tenant-invoice.schema';
import { ReconciliationRun } from '../cam/schemas/reconciliation-run.schema';
import type { DashboardAnalyticsResponse } from './dashboard-analytics.types';
import type { DashboardCamResponse } from './dashboard-cam.types';
import type { DashboardOverviewResponse } from './dashboard-overview.types';

interface LeaseField {
  value?: unknown;
  citation?: string;
  amendments?: unknown[];
  pageReference?: string;
}

interface LeaseInformation {
  [key: string]: LeaseField | unknown;
}

interface FinancialStack {
  summaryCards?: Array<{ label: string; value: number; unit: string }>;
  rentSchedule?: Array<{
    period: string;
    monthlyRent: number | string;
    annualRent: number | string;
    notes?: string;
  }>;
  additionalCharges?: Array<{ description: string; amount: number | string }>;
}

interface LeaseDoc {
  leaseId: string;
  portfolio_id: string;
  property_id: string;
  status: string;
  file_name?: string;
  lease_information?: { leaseInformation?: LeaseInformation };
  analysis?: { financialStack?: FinancialStack; [k: string]: unknown };
}

const TENANT_CONCENTRATION_TOP_N = 5;
const TOP_TENANTS_LIMIT = 5;
const REVENUE_BY_PROPERTY_LIMIT = 3;
const EVENTS_TIMELINE_LIMIT = 12;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(Lease.name) private leaseModel: Model<Lease>,
    @InjectModel(TaskAlert.name) private taskAlertModel: Model<TaskAlert>,
    @InjectModel(PropertyAlert.name)
    private propertyAlertModel: Model<PropertyAlert>,
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
    @InjectModel(Unit.name) private unitModel: Model<Unit>,
    @InjectModel(TenantInvoice.name)
    private tenantInvoiceModel: Model<TenantInvoice>,
    @InjectModel(ReconciliationRun.name)
    private reconciliationRunModel: Model<ReconciliationRun>,
  ) {}

  async getDashboardGeneral(
    _portfolioId?: string,
    _recentFilter?: string,
    _orgId?: string,
  ): Promise<{ status: string }> {
    // Operational overview is being rebuilt against the new dashboard shape;
    // the previous stub is no longer wired into the frontend.
    return { status: 'not_implemented' };
  }

  /**
   * Portfolio-wide analytics for the dashboard's Analytics tab. Aggregates
   * over the caller's accessible portfolios (or a specific portfolio_id when
   * provided). Returns zero/null fields gracefully when data is missing —
   * never throws — so the UI can render a clean "empty" state for new orgs.
   */
  async getDashboardAnalytics(
    portfolioId?: string,
    orgId?: string,
  ): Promise<DashboardAnalyticsResponse> {
    const asOfYear = new Date().getUTCFullYear();
    const portfolioIds = portfolioId
      ? [portfolioId]
      : await this.getAccessiblePortfolioIds(orgId);

    if (portfolioIds.length === 0) {
      return this.emptyResponse(asOfYear);
    }

    const filter = { portfolio_id: { $in: portfolioIds } };

    const [properties, units, leases, propertyAlerts, legacyAlerts] =
      await Promise.all([
        this.propertyModel.find(filter).lean().exec(),
        this.unitModel.find(filter).lean().exec(),
        this.leaseModel
          .find({ ...filter, status: 'processed' })
          .lean()
          .exec() as unknown as Promise<LeaseDoc[]>,
        this.propertyAlertModel
          .find({ ...filter, is_resolved: { $ne: true } })
          .lean()
          .exec(),
        this.taskAlertModel
          .find({ ...filter, category: 'alert', is_resolved: { $ne: true } })
          .lean()
          .exec(),
      ]);

    const propertyMap = new Map(
      (properties as Array<{ propertyId: string; property_name: string }>).map(
        (p) => [p.propertyId, p],
      ),
    );

    // ── Pre-extract per-lease numbers we re-use across multiple sections.
    const leaseRows = leases.map((lease) => extractLeaseRow(lease));

    // ── KPIs
    const propertyCount = properties.length;
    const unitsCount = units.length;
    const leasedSqft = sum(leaseRows.map((r) => r.sqft ?? 0));

    const occupiedUnits = units.filter(
      (u: any) => u.occupancy_status === 'occupied',
    ).length;
    const occupancyPct =
      units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : null;

    const avgRentPerSqftUsd = weightedAverage(
      leaseRows
        .filter((r) => r.rentPerSqft != null && r.sqft != null)
        .map((r) => ({ value: r.rentPerSqft!, weight: r.sqft! })),
    );

    const avgTermLeftYears = weightedAverage(
      leaseRows
        .filter((r) => r.termLeftYears != null && r.annualRentUsd != null)
        .map((r) => ({
          value: r.termLeftYears!,
          weight: r.annualRentUsd!,
        })),
    );

    // ── Callouts
    const expiringRows = leaseRows.filter((r) => r.expiresInDays != null && r.expiresInDays >= 0 && r.expiresInDays <= 365);
    const expiringNext12Months = {
      count: expiringRows.length,
      annualRentAtStakeUsd: Math.round(
        sum(expiringRows.map((r) => r.annualRentUsd ?? 0)),
      ),
    };

    const severeAlerts = [...propertyAlerts, ...legacyAlerts].filter(
      (a: any) => a.severity === 'critical' || a.severity === 'high',
    );
    const highSeverityRisks = {
      count: severeAlerts.length,
      leasesAffected: new Set(severeAlerts.map((a: any) => String(a.lease_id))).size,
    };

    // Tenant concentration: aggregate annual rent by tenant, take top N share.
    const rentByTenant = new Map<string, number>();
    for (const r of leaseRows) {
      if (!r.annualRentUsd || !r.tenant) continue;
      rentByTenant.set(
        r.tenant,
        (rentByTenant.get(r.tenant) ?? 0) + r.annualRentUsd,
      );
    }
    const totalAnnualRent = sum(Array.from(rentByTenant.values()));
    const topTenantRents = Array.from(rentByTenant.values())
      .sort((a, b) => b - a)
      .slice(0, TENANT_CONCENTRATION_TOP_N);
    const tenantConcentration = {
      topN: TENANT_CONCENTRATION_TOP_N,
      sharePct:
        totalAnnualRent > 0
          ? Math.round((sum(topTenantRents) / totalAnnualRent) * 100)
          : 0,
    };

    // ── Events timeline (current year only).
    const eventsTimeline = buildEventsTimeline(leaseRows, asOfYear).slice(
      0,
      EVENTS_TIMELINE_LIMIT,
    );

    // ── Revenue by property (top N).
    const revenueByPropertyMap = new Map<string, number>();
    for (const r of leaseRows) {
      if (!r.annualRentUsd) continue;
      revenueByPropertyMap.set(
        r.propertyId,
        (revenueByPropertyMap.get(r.propertyId) ?? 0) + r.annualRentUsd,
      );
    }
    const totalPropertyRevenue = sum(
      Array.from(revenueByPropertyMap.values()),
    );
    const revenueByProperty = Array.from(revenueByPropertyMap.entries())
      .map(([propertyId, annualRentUsd]) => ({
        propertyId,
        propertyName:
          (propertyMap.get(propertyId) as { property_name?: string })
            ?.property_name ?? 'Unknown property',
        annualRentUsd: Math.round(annualRentUsd),
        sharePct:
          totalPropertyRevenue > 0
            ? Math.round((annualRentUsd / totalPropertyRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.annualRentUsd - a.annualRentUsd)
      .slice(0, REVENUE_BY_PROPERTY_LIMIT);

    // ── Top tenants (full lease detail for the side panel).
    const topTenants = leaseRows
      .filter((r) => r.annualRentUsd && r.tenant)
      .sort((a, b) => (b.annualRentUsd ?? 0) - (a.annualRentUsd ?? 0))
      .slice(0, TOP_TENANTS_LIMIT)
      .map((r) => ({
        tenant: r.tenant!,
        annualRentUsd: Math.round(r.annualRentUsd!),
        sharePct:
          totalAnnualRent > 0
            ? Math.round((r.annualRentUsd! / totalAnnualRent) * 100)
            : 0,
        propertyName:
          (propertyMap.get(r.propertyId) as { property_name?: string })
            ?.property_name ?? null,
        expiresOn: r.expiresOnIso ?? null,
        leaseId: r.leaseId,
      }));

    return {
      kpis: {
        propertyCount,
        unitsCount,
        leasedSqft,
        occupancyPct,
        avgRentPerSqftUsd:
          avgRentPerSqftUsd != null ? Math.round(avgRentPerSqftUsd * 100) / 100 : null,
        avgTermLeftYears:
          avgTermLeftYears != null ? Math.round(avgTermLeftYears * 10) / 10 : null,
      },
      callouts: {
        expiringNext12Months,
        highSeverityRisks,
        tenantConcentration,
      },
      eventsTimeline,
      revenueByProperty,
      topTenants,
      asOfYear,
    };
  }

  /**
   * CAM Recoveries tab payload. Aggregates over `tenant_invoices` (already
   * billed + outstanding) and `reconciliation_runs` (still-recoverable +
   * money-on-the-table). Same RBAC/fail-closed contract as the analytics
   * endpoint.
   */
  async getDashboardCam(
    portfolioId?: string,
    orgId?: string,
  ): Promise<DashboardCamResponse> {
    const asOfYear = new Date().getUTCFullYear();
    const portfolioIds = portfolioId
      ? [portfolioId]
      : await this.getAccessiblePortfolioIds(orgId);

    if (portfolioIds.length === 0) {
      return this.emptyCamResponse(asOfYear);
    }

    const portfolioScope = { portfolio_id: { $in: portfolioIds } };

    const [
      properties,
      invoicesThisYear,
      reconRunsThisYear,
      cmAlerts,
    ] = await Promise.all([
      this.propertyModel.find(portfolioScope).lean().exec(),
      this.tenantInvoiceModel
        .find({
          ...portfolioScope,
          calendar_year: asOfYear,
          status: 'committed',
        })
        .lean()
        .exec() as unknown as Promise<RawInvoice[]>,
      this.reconciliationRunModel
        .find({ ...portfolioScope, calendar_year: asOfYear })
        .lean()
        .exec() as unknown as Promise<RawReconRun[]>,
      this.propertyAlertModel
        .find({
          ...portfolioScope,
          is_resolved: { $ne: true },
        })
        .lean()
        .exec() as unknown as Promise<RawAlert[]>,
    ]);

    const propertyMap = new Map(
      (properties as Array<{ propertyId: string; property_name: string }>).map(
        (p) => [p.propertyId, p],
      ),
    );

    // ── KPIs ──────────────────────────────────────────────────────────────
    const alreadyBilledThisYearUsd = sumBy(
      invoicesThisYear,
      (i) => i.invoice_amount ?? 0,
    );

    // Still recoverable = positive deltas across PREVIEW runs (those that
    // haven't been "applied" into adjustment invoices yet). Applied runs are
    // already reflected in the invoices total above and shouldn't be
    // double-counted here.
    const previewRuns = reconRunsThisYear.filter((r) => r.mode === 'preview');
    const stillRecoverableUsd = sumBy(previewRuns, (r) =>
      Math.max(0, r.total_delta ?? 0),
    );
    const leasesAffectedByRecoverable = countDistinctUnitsWithPositiveDelta(
      previewRuns,
    );

    const totalBillableThisYearUsd =
      alreadyBilledThisYearUsd + stillRecoverableUsd;
    const billedSharePct =
      totalBillableThisYearUsd > 0
        ? Math.round(
            (alreadyBilledThisYearUsd / totalBillableThisYearUsd) * 100,
          )
        : 0;

    // Outstanding: per committed invoice, (invoice_amount - tenant_paid_amount)
    // counted only when (committed_at is older than 30 days) AND positive.
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let outstandingFromTenantsUsd = 0;
    let outstandingFromTenantsCount = 0;
    for (const inv of invoicesThisYear) {
      const committedAtMs = inv.committed_at
        ? new Date(inv.committed_at).getTime()
        : null;
      if (committedAtMs == null || committedAtMs > thirtyDaysAgo) continue;
      const unpaid = (inv.invoice_amount ?? 0) - (inv.tenant_paid_amount ?? 0);
      if (unpaid > 0.01) {
        outstandingFromTenantsUsd += unpaid;
        outstandingFromTenantsCount += 1;
      }
    }

    // ── Revenue by type ─────────────────────────────────────────────────
    const byCategory = new Map<string, { amount: number; count: number }>();
    for (const inv of invoicesThisYear) {
      const label = pickCategoryLabel(inv);
      const slot = byCategory.get(label) ?? { amount: 0, count: 0 };
      slot.amount += inv.invoice_amount ?? 0;
      slot.count += 1;
      byCategory.set(label, slot);
    }
    const revenueByType = Array.from(byCategory.entries())
      .map(([category, { amount, count }]) => ({
        category,
        billedUsd: Math.round(amount),
        sharePct:
          alreadyBilledThisYearUsd > 0
            ? Math.round((amount / alreadyBilledThisYearUsd) * 100)
            : 0,
        invoiceCount: count,
      }))
      .sort((a, b) => b.billedUsd - a.billedUsd);

    // ── Money on the table ──────────────────────────────────────────────
    const moneyOnTheTable: DashboardCamResponse['moneyOnTheTable'] = [];
    for (const run of previewRuns) {
      if ((run.total_delta ?? 0) <= 0) continue;
      const propertyName =
        propertyMap.get(run.property_id)?.property_name ??
        'Unknown property';
      moneyOnTheTable.push({
        kind: 'under_billed',
        title: `${propertyName} · ${run.calendar_year} reconciliation found under-billed amounts`,
        sub: `${run.units_with_discrepancies ?? 0} unit${
          (run.units_with_discrepancies ?? 0) === 1 ? '' : 's'
        } affected across ${run.bills_affected ?? 0} bill${
          (run.bills_affected ?? 0) === 1 ? '' : 's'
        }. Run a confirmed reconciliation to issue adjustment invoices.`,
        amountUsd: Math.round(run.total_delta ?? 0),
        severity:
          (run.total_delta ?? 0) >= 25_000
            ? 'high'
            : (run.total_delta ?? 0) >= 5_000
              ? 'medium'
              : 'low',
        propertyId: run.property_id,
      });
    }
    const camAlertsFlagged = cmAlerts.filter(isCamAlert);
    for (const a of camAlertsFlagged) {
      moneyOnTheTable.push({
        kind: 'cam_alert',
        title: a.title,
        sub: a.details || a.suggested_action || '',
        severity: normaliseSeverity(a.severity),
        propertyId: a.property_id,
      });
    }
    // Highest-impact rows first.
    moneyOnTheTable.sort(
      (a, b) =>
        severityRank(a.severity) - severityRank(b.severity) ||
        (b.amountUsd ?? 0) - (a.amountUsd ?? 0),
    );

    // ── CAM by property ─────────────────────────────────────────────────
    const billedByProperty = new Map<string, number>();
    for (const inv of invoicesThisYear) {
      billedByProperty.set(
        inv.property_id,
        (billedByProperty.get(inv.property_id) ?? 0) +
          (inv.invoice_amount ?? 0),
      );
    }
    const stillRecoverableByProperty = new Map<string, number>();
    for (const run of previewRuns) {
      if ((run.total_delta ?? 0) <= 0) continue;
      stillRecoverableByProperty.set(
        run.property_id,
        (stillRecoverableByProperty.get(run.property_id) ?? 0) +
          (run.total_delta ?? 0),
      );
    }
    const propertyIds = new Set<string>([
      ...billedByProperty.keys(),
      ...stillRecoverableByProperty.keys(),
    ]);
    const camByProperty = Array.from(propertyIds)
      .map((propertyId) => {
        const billed = billedByProperty.get(propertyId) ?? 0;
        const left = stillRecoverableByProperty.get(propertyId) ?? 0;
        const billable = billed + left;
        return {
          propertyId,
          propertyName:
            propertyMap.get(propertyId)?.property_name ?? 'Unknown property',
          billedUsd: Math.round(billed),
          billableUsd: Math.round(billable),
          leftUsd: Math.round(left),
          sharePct:
            billable > 0 ? Math.round((billed / billable) * 100) : 0,
        };
      })
      .sort((a, b) => b.billableUsd - a.billableUsd);

    // ── Overall recovery donut ──────────────────────────────────────────
    const camRecoveryRate = {
      billedUsd: Math.round(alreadyBilledThisYearUsd),
      billableUsd: Math.round(totalBillableThisYearUsd),
      ratePct: billedSharePct,
    };

    // ── CAM risks (separate, prominent list) ─────────────────────────────
    const camRisks = cmAlerts
      .filter(isCamAlert)
      .map((a) => ({
        itemId: a.itemId,
        title: a.title,
        severity: normaliseSeverity(a.severity),
        details: a.details ?? '',
        propertyId: a.property_id,
      }))
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
      .slice(0, 6);

    return {
      asOfYear,
      kpis: {
        totalBillableThisYearUsd: Math.round(totalBillableThisYearUsd),
        alreadyBilledThisYearUsd: Math.round(alreadyBilledThisYearUsd),
        billedSharePct,
        stillRecoverableUsd: Math.round(stillRecoverableUsd),
        leasesAffectedByRecoverable,
        outstandingFromTenantsUsd: Math.round(outstandingFromTenantsUsd),
        outstandingFromTenantsCount,
      },
      revenueByType,
      moneyOnTheTable,
      camByProperty,
      camRecoveryRate,
      camRisks,
    };
  }

  /**
   * Operational Overview tab — single round-trip combining biggest risk +
   * "what needs attention" KPIs + open task list + invoice-vs-payment trend.
   * Same RBAC/fail-closed contract as `/analytics` and `/cam`.
   *
   * Executive Overview's narrative briefings are NOT here — that's a
   * scheduled LLM feature with its own lifecycle.
   */
  async getDashboardOverview(
    portfolioId?: string,
    orgId?: string,
  ): Promise<DashboardOverviewResponse> {
    const now = new Date();
    const asOfYear = now.getUTCFullYear();
    const asOfDate = now.toISOString().slice(0, 10);

    const portfolioIds = portfolioId
      ? [portfolioId]
      : await this.getAccessiblePortfolioIds(orgId);

    if (portfolioIds.length === 0) {
      return this.emptyOverviewResponse(asOfYear, asOfDate);
    }

    const portfolioScope = { portfolio_id: { $in: portfolioIds } };

    const [
      properties,
      leases,
      units,
      propertyAlerts,
      legacyAlertsAndTasks,
      invoicesThisYear,
      previewRunsThisYear,
    ] = await Promise.all([
      this.propertyModel.find(portfolioScope).lean().exec(),
      this.leaseModel
        .find({ ...portfolioScope, status: 'processed' })
        .lean()
        .exec(),
      this.unitModel.find(portfolioScope).lean().exec(),
      this.propertyAlertModel
        .find({ ...portfolioScope, is_resolved: { $ne: true } })
        .lean()
        .exec() as unknown as Promise<RawAlert[]>,
      this.taskAlertModel
        .find({ ...portfolioScope, is_resolved: { $ne: true } })
        .lean()
        .exec() as unknown as Promise<RawLegacyTaskAlert[]>,
      this.tenantInvoiceModel
        .find({
          ...portfolioScope,
          calendar_year: asOfYear,
          status: 'committed',
        })
        .lean()
        .exec() as unknown as Promise<RawInvoice[]>,
      this.reconciliationRunModel
        .find({
          ...portfolioScope,
          calendar_year: asOfYear,
          mode: 'preview',
        })
        .lean()
        .exec() as unknown as Promise<RawReconRun[]>,
    ]);

    const propertyMap = new Map(
      (properties as Array<{ propertyId: string; property_name: string }>).map(
        (p) => [p.propertyId, p],
      ),
    );

    // ── Briefing stats ──────────────────────────────────────────────────
    const newRecoverableUsd = sumBy(previewRunsThisYear, (r) =>
      Math.max(0, r.total_delta ?? 0),
    );
    const openSevereAlerts = propertyAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'high',
    );
    const legacyOpenAlerts = legacyAlertsAndTasks.filter(
      (t) => t.category === 'alert',
    );
    const legacyOpenTasks = legacyAlertsAndTasks.filter(
      (t) => t.category === 'task',
    );
    const allOpenAlerts = [...propertyAlerts, ...legacyOpenAlerts];

    // ── Biggest risk: highest-severity unresolved alert ─────────────────
    const ranked = [...allOpenAlerts].sort(
      (a, b) =>
        severityRank(normaliseSeverity(a.severity)) -
        severityRank(normaliseSeverity(b.severity)),
    );
    const top = ranked[0];
    const biggestRisk = top
      ? {
          itemId: top.itemId,
          title: top.title,
          severity: normaliseSeverity(top.severity),
          propertyId: top.property_id,
          propertyName:
            propertyMap.get(top.property_id)?.property_name ?? 'Unknown property',
          leaseId: top.lease_id ?? null,
          details: top.details ?? '',
          suggestedAction:
            (top as { suggested_action?: string }).suggested_action ?? null,
        }
      : null;

    // ── Actions this week — coarse keyword breakdown over open tasks ────
    const actionsThisWeek = bucketTasks(legacyOpenTasks);

    // ── Attention KPI cards ─────────────────────────────────────────────
    const highCount = allOpenAlerts.filter(
      (a) => normaliseSeverity(a.severity) === 'high' ||
        normaliseSeverity(a.severity) === 'critical',
    ).length;
    const mediumCount = allOpenAlerts.filter(
      (a) => normaliseSeverity(a.severity) === 'medium',
    ).length;

    // Deadlines this quarter = leases expiring in the next 92 days +
    // alerts with a due_timeline date in the next 92 days.
    const nowMs = now.getTime();
    const ninetyTwoDaysMs = nowMs + 92 * 24 * 60 * 60 * 1000;
    const expiringSoonCount = leases.filter((l) => {
      const li = (l as { lease_information?: { leaseInformation?: Record<string, unknown> } })
        .lease_information?.leaseInformation;
      const leaseTo = li?.leaseTo;
      const raw = (leaseTo as { value?: unknown } | undefined)?.value;
      if (typeof raw !== 'string') return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      const ts = d.getTime();
      return ts >= nowMs && ts <= ninetyTwoDaysMs;
    }).length;
    const dueSoonAlertCount = allOpenAlerts.filter((a) => {
      const due = (a as { due_timeline?: string }).due_timeline;
      if (!due) return false;
      const d = new Date(due);
      if (isNaN(d.getTime())) return false;
      const ts = d.getTime();
      return ts >= nowMs && ts <= ninetyTwoDaysMs;
    }).length;

    // ── Money trend (monthly) ────────────────────────────────────────────
    const moneyTrend = buildMonthlyTrend(invoicesThisYear, asOfYear);

    // ── Do this week — sorted open tasks (+ critical alerts) ─────────────
    const doThisWeek = buildDoThisWeek(
      legacyOpenTasks,
      openSevereAlerts,
      propertyMap,
    );

    void units; // reserved for future "X leases / Y units overnight" copy

    return {
      asOfYear,
      asOfDate,
      briefing: {
        leasesChecked: leases.length,
        unitsCovered: units.length,
        newRecoverableUsd: Math.round(newRecoverableUsd),
        needsAttentionCount: openSevereAlerts.length + legacyOpenAlerts.filter(
          (a) =>
            normaliseSeverity(a.severity) === 'critical' ||
            normaliseSeverity(a.severity) === 'high',
        ).length,
      },
      biggestRisk,
      actionsThisWeek,
      attentionCards: {
        underBilledUsd: Math.round(newRecoverableUsd),
        risks: { high: highCount, medium: mediumCount },
        deadlinesThisQuarter: expiringSoonCount + dueSoonAlertCount,
      },
      moneyTrend,
      doThisWeek,
    };
  }

  private emptyOverviewResponse(
    asOfYear: number,
    asOfDate: string,
  ): DashboardOverviewResponse {
    return {
      asOfYear,
      asOfDate,
      briefing: {
        leasesChecked: 0,
        unitsCovered: 0,
        newRecoverableUsd: 0,
        needsAttentionCount: 0,
      },
      biggestRisk: null,
      actionsThisWeek: {
        totalCount: 0,
        breakdown: { bills: 0, renewals: 0, other: 0 },
      },
      attentionCards: {
        underBilledUsd: 0,
        risks: { high: 0, medium: 0 },
        deadlinesThisQuarter: 0,
      },
      moneyTrend: buildMonthlyTrend([], asOfYear),
      doThisWeek: [],
    };
  }

  private emptyCamResponse(asOfYear: number): DashboardCamResponse {
    return {
      asOfYear,
      kpis: {
        totalBillableThisYearUsd: 0,
        alreadyBilledThisYearUsd: 0,
        billedSharePct: 0,
        stillRecoverableUsd: 0,
        leasesAffectedByRecoverable: 0,
        outstandingFromTenantsUsd: 0,
        outstandingFromTenantsCount: 0,
      },
      revenueByType: [],
      moneyOnTheTable: [],
      camByProperty: [],
      camRecoveryRate: { billedUsd: 0, billableUsd: 0, ratePct: 0 },
      camRisks: [],
    };
  }

  /**
   * Returns portfolioIds the caller's organization can read. Mirrors
   * PortfolioService's orgFilter — orgless callers see nothing.
   */
  private async getAccessiblePortfolioIds(orgId?: string): Promise<string[]> {
    if (!orgId) return [];
    const docs = await this.portfolioModel
      .find({ organization_id: orgId })
      .select({ portfolioId: 1, _id: 0 })
      .lean()
      .exec();
    return docs.map((d) => (d as { portfolioId: string }).portfolioId);
  }

  private emptyResponse(asOfYear: number): DashboardAnalyticsResponse {
    return {
      kpis: {
        propertyCount: 0,
        unitsCount: 0,
        leasedSqft: 0,
        occupancyPct: null,
        avgRentPerSqftUsd: null,
        avgTermLeftYears: null,
      },
      callouts: {
        expiringNext12Months: { count: 0, annualRentAtStakeUsd: 0 },
        highSeverityRisks: { count: 0, leasesAffected: 0 },
        tenantConcentration: {
          topN: TENANT_CONCENTRATION_TOP_N,
          sharePct: 0,
        },
      },
      eventsTimeline: [],
      revenueByProperty: [],
      topTenants: [],
      asOfYear,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers — pure, no DB access. Easier to unit-test and to reason about
// the noisy lease-extraction fallback paths in isolation.
// ─────────────────────────────────────────────────────────────────────────

interface ExtractedLease {
  leaseId: string;
  propertyId: string;
  fileName: string;
  tenant: string | null;
  suite: string | null;
  sqft: number | null;
  rentPerSqft: number | null;
  annualRentUsd: number | null;
  expiresOnIso: string | null;
  expiresInDays: number | null;
  termLeftYears: number | null;
  rentScheduleRaw: FinancialStack['rentSchedule'];
}

function extractLeaseRow(lease: LeaseDoc): ExtractedLease {
  const li = lease.lease_information?.leaseInformation ?? {};
  const fs = lease.analysis?.financialStack ?? {};
  const now = Date.now();

  const sqft = parseNumber(fieldValue(li.squareFeet));
  const rentPerSqft = parseNumber(fieldValue(li.rentPerSqFt));

  // Prefer the structured Year-1 annual rent from the financial stack; fall
  // back to (sqft × rentPerSqft) when the rentSchedule wasn't extracted.
  const annualRentFromSchedule = parseNumber(
    fs.rentSchedule?.[0]?.annualRent,
  );
  const annualRentUsd =
    annualRentFromSchedule ??
    (sqft != null && rentPerSqft != null ? sqft * rentPerSqft : null);

  const leaseToValue = fieldValue(li.leaseTo);
  const expiresOn = parseDate(leaseToValue);
  const expiresOnIso = expiresOn ? expiresOn.toISOString().slice(0, 10) : null;
  const expiresInDays = expiresOn
    ? Math.round((expiresOn.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const termLeftYears =
    expiresInDays != null && expiresInDays >= 0
      ? Math.round((expiresInDays / 365) * 10) / 10
      : null;

  return {
    leaseId: lease.leaseId,
    propertyId: lease.property_id,
    fileName: lease.file_name ?? '',
    tenant: extractTenant(lease),
    suite: typeof fieldValue(li.property) === 'string'
      ? (fieldValue(li.property) as string)
      : null,
    sqft,
    rentPerSqft,
    annualRentUsd,
    expiresOnIso,
    expiresInDays,
    termLeftYears,
    rentScheduleRaw: fs.rentSchedule,
  };
}

/**
 * Tenant name extraction is the noisiest part of the dataset — the analyzer
 * sometimes puts the tenant string in `leaseTo` instead of a real date.
 * Fall back through several signals before giving up.
 */
function extractTenant(lease: LeaseDoc): string | null {
  const li = lease.lease_information?.leaseInformation ?? {};

  const leaseToText = fieldValue(li.leaseTo);
  // If leaseTo isn't a date but looks like a name/entity, treat it as tenant.
  if (typeof leaseToText === 'string' && leaseToText && !parseDate(leaseToText)) {
    return leaseToText;
  }

  const leaseTitle = fieldValue(li.lease);
  if (typeof leaseTitle === 'string') {
    // "Retail Lease Agreement between LLC X and Tenant Y" — too noisy to
    // parse reliably. Skip and fall back to the file name.
  }

  if (lease.file_name) {
    return lease.file_name.replace(/\.[^.]+$/, '');
  }
  return null;
}

function fieldValue(field: unknown): unknown {
  if (field && typeof field === 'object' && 'value' in (field as object)) {
    return (field as { value: unknown }).value;
  }
  return field;
}

/**
 * Parse a number out of strings like "$76,000.00", "28500", "$32.00 per …".
 * Returns null when nothing usable is present.
 */
function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Grab the FIRST numeric token (with optional decimals + commas).
  const match = trimmed.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  // Guard against parsing things like "Sonoran Orthopedic" (which technically
  // produces an invalid Date — but Date('Sonoran') is NaN, so we're safe).
  return d;
}

function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

function weightedAverage(
  rows: Array<{ value: number; weight: number }>,
): number | null {
  if (rows.length === 0) return null;
  const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
  if (totalWeight <= 0) return null;
  const weightedSum = rows.reduce((acc, r) => acc + r.value * r.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * Build the per-lease timeline of events that fall within the requested year.
 * We surface two event types reliably:
 *   - `lease_expires`: the leaseTo date.
 *   - `rent_escalation`: each rentSchedule period start that falls in-year.
 * Renewal-notice / termination-window events would require parsing
 * operationalGuardrails clauses — TODO once those are more reliably extracted.
 */
function buildEventsTimeline(
  rows: ExtractedLease[],
  year: number,
): DashboardAnalyticsResponse['eventsTimeline'] {
  const out: DashboardAnalyticsResponse['eventsTimeline'] = [];

  for (const r of rows) {
    const events: DashboardAnalyticsResponse['eventsTimeline'][number]['events'] =
      [];

    if (r.expiresOnIso && r.expiresOnIso.startsWith(String(year))) {
      events.push({
        type: 'lease_expires',
        date: r.expiresOnIso,
        label: 'Lease expires',
      });
    }

    // rentSchedule periods often encode escalation steps. When a period's
    // implied start date falls in `year`, surface it as an escalation event.
    if (r.rentScheduleRaw && r.expiresOnIso) {
      // We don't have explicit period start dates, but lease start +
      // periodIndex(years) is a reasonable proxy. Skip for now and surface
      // only the most reliable signal (expiration); we'll add escalation
      // dates when we have proper period-start extraction.
    }

    if (events.length > 0) {
      out.push({
        tenant: r.tenant ?? r.fileName ?? 'Unknown tenant',
        suite: r.suite ?? '',
        propertyId: r.propertyId ?? null,
        events: events.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }
  }

  return out.sort((a, b) =>
    (a.events[0]?.date ?? '').localeCompare(b.events[0]?.date ?? ''),
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CAM helpers — kept separate from the analytics helpers above for clarity.
// All work off raw Mongo docs (typed loosely as the schemas use `unknown`
// for several optional fields). The narrow types below are just enough to
// keep TypeScript honest without dragging in the full schema imports.
// ─────────────────────────────────────────────────────────────────────────

interface RawInvoice {
  invoiceId: string;
  invoice_kind?: 'original' | 'adjustment';
  property_id: string;
  unit_id: string;
  invoice_amount?: number;
  tenant_paid_amount?: number;
  expense_category?: string | null;
  calendar_year?: number;
  committed_at?: Date | string | null;
  status?: string;
}

interface RawReconRun {
  runId: string;
  property_id: string;
  unit_id?: string | null;
  calendar_year: number;
  mode: 'preview' | 'applied';
  total_delta?: number;
  units_with_discrepancies?: number;
  bills_affected?: number;
  by_unit?: Array<{ unit_id: string; delta?: number }>;
}

interface RawAlert {
  itemId: string;
  property_id: string;
  lease_id?: string;
  title: string;
  severity: string;
  details?: string;
  alert_type?: string;
  suggested_action?: string;
}

function sumBy<T>(rows: T[], fn: (row: T) => number): number {
  let total = 0;
  for (const r of rows) total += fn(r) || 0;
  return total;
}

function pickCategoryLabel(inv: RawInvoice): string {
  if (inv.invoice_kind === 'adjustment') return 'Reconciliation adjustments';
  const cat = (inv.expense_category ?? '').trim();
  return cat || 'Uncategorized';
}

function countDistinctUnitsWithPositiveDelta(runs: RawReconRun[]): number {
  const units = new Set<string>();
  for (const r of runs) {
    if ((r.total_delta ?? 0) <= 0) continue;
    if (r.by_unit && r.by_unit.length > 0) {
      for (const u of r.by_unit) {
        if ((u.delta ?? 0) > 0 && u.unit_id) units.add(u.unit_id);
      }
    } else if (r.unit_id) {
      units.add(r.unit_id);
    }
  }
  return units.size;
}

function isCamAlert(a: RawAlert): boolean {
  const type = (a.alert_type ?? '').toLowerCase();
  const title = (a.title ?? '').toLowerCase();
  return (
    type.includes('cam') ||
    type.includes('opex') ||
    type.includes('operating') ||
    title.includes('cam') ||
    title.includes('opex')
  );
}

function normaliseSeverity(
  value: string,
): 'critical' | 'high' | 'medium' | 'low' {
  const v = String(value || '').toLowerCase();
  if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') {
    return v;
  }
  return 'medium';
}

function severityRank(s: 'critical' | 'high' | 'medium' | 'low'): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

// ─────────────────────────────────────────────────────────────────────────
// Overview helpers
// ─────────────────────────────────────────────────────────────────────────

interface RawLegacyTaskAlert {
  itemId: string;
  property_id: string;
  lease_id?: string;
  title: string;
  severity: string;
  details?: string;
  is_resolved?: boolean;
  category?: string;
  sortOrder?: number;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Build the 12-month CAM-invoiced-vs-paid trend for the current year.
 *
 * "Invoiced" buckets each tenant_invoice by its `committed_at` month.
 * "Paid" walks `payment_history` entries and buckets each payment by the
 * `paid_at` date. If a tenant paid an invoice across two months, both
 * months see the corresponding partial.
 */
function buildMonthlyTrend(
  invoices: RawInvoice[],
  year: number,
): {
  months: Array<{ month: string; invoicedUsd: number; paidUsd: number }>;
  ytdInvoicedUsd: number;
  ytdPaidUsd: number;
  gapUsd: number;
  gapPct: number;
} {
  const monthly = MONTH_LABELS.map((label) => ({
    month: label,
    invoicedUsd: 0,
    paidUsd: 0,
  }));

  for (const inv of invoices) {
    const committed = inv.committed_at ? new Date(inv.committed_at) : null;
    if (committed && !isNaN(committed.getTime()) && committed.getUTCFullYear() === year) {
      const m = committed.getUTCMonth();
      monthly[m].invoicedUsd += inv.invoice_amount ?? 0;
    }
    const history = (inv as { payment_history?: Array<{ paid_at?: Date | string; amount?: number }> })
      .payment_history;
    if (!Array.isArray(history)) continue;
    for (const entry of history) {
      if (!entry?.paid_at || entry.amount == null) continue;
      const d = new Date(entry.paid_at);
      if (isNaN(d.getTime())) continue;
      if (d.getUTCFullYear() !== year) continue;
      monthly[d.getUTCMonth()].paidUsd += entry.amount;
    }
  }

  // Round to whole dollars on the way out so the chart axes stay tidy.
  const rounded = monthly.map((m) => ({
    month: m.month,
    invoicedUsd: Math.round(m.invoicedUsd),
    paidUsd: Math.round(m.paidUsd),
  }));
  const ytdInvoicedUsd = rounded.reduce((acc, m) => acc + m.invoicedUsd, 0);
  const ytdPaidUsd = rounded.reduce((acc, m) => acc + m.paidUsd, 0);
  const gapUsd = ytdInvoicedUsd - ytdPaidUsd;
  const gapPct =
    ytdInvoicedUsd > 0 ? Math.round((gapUsd / ytdInvoicedUsd) * 100) : 0;

  return { months: rounded, ytdInvoicedUsd, ytdPaidUsd, gapUsd, gapPct };
}

/**
 * Coarse, keyword-based breakdown of open tasks. We don't have a typed
 * `task_kind` field yet, so we look for substring matches in the title.
 * Anything that doesn't match a known bucket falls into `other`.
 */
function bucketTasks(
  tasks: RawLegacyTaskAlert[],
): {
  totalCount: number;
  breakdown: { bills: number; renewals: number; other: number };
} {
  let bills = 0;
  let renewals = 0;
  let other = 0;
  for (const t of tasks) {
    const title = (t.title ?? '').toLowerCase();
    if (title.includes('bill') || title.includes('invoice') || title.includes('cam')) {
      bills += 1;
    } else if (
      title.includes('renew') ||
      title.includes('option') ||
      title.includes('expir')
    ) {
      renewals += 1;
    } else {
      other += 1;
    }
  }
  return {
    totalCount: tasks.length,
    breakdown: { bills, renewals, other },
  };
}

/**
 * Build the "Do this week" list — top open tasks first by severity, then
 * by sortOrder. Open severe alerts (critical/high) get folded in alongside
 * tasks so the user sees them in the same lane.
 */
function buildDoThisWeek(
  tasks: RawLegacyTaskAlert[],
  alerts: RawAlert[],
  propertyMap: Map<string, { property_name: string }>,
): Array<{
  itemId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  propertyName: string | null;
  propertyId: string | null;
  leaseId: string | null;
  dueLabel: string;
  details: string;
}> {
  const items: Array<{
    itemId: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    propertyName: string | null;
    propertyId: string | null;
    leaseId: string | null;
    dueLabel: string;
    details: string;
    sortKey: number;
  }> = [];

  for (const t of tasks) {
    items.push({
      itemId: t.itemId,
      title: t.title,
      severity: normaliseSeverity(t.severity),
      propertyName: propertyMap.get(t.property_id)?.property_name ?? null,
      propertyId: t.property_id ?? null,
      leaseId: t.lease_id ?? null,
      dueLabel: 'This week',
      details: t.details ?? '',
      sortKey: severityRank(normaliseSeverity(t.severity)) * 100 +
        (t.sortOrder ?? 50),
    });
  }
  for (const a of alerts) {
    items.push({
      itemId: a.itemId,
      title: a.title,
      severity: normaliseSeverity(a.severity),
      propertyName: propertyMap.get(a.property_id)?.property_name ?? null,
      propertyId: a.property_id ?? null,
      leaseId: a.lease_id ?? null,
      dueLabel:
        normaliseSeverity(a.severity) === 'critical' ? 'Today' : 'This week',
      details: a.details ?? '',
      sortKey: severityRank(normaliseSeverity(a.severity)) * 100,
    });
  }

  items.sort((a, b) => a.sortKey - b.sortKey);
  return items.slice(0, 8).map(({ sortKey: _ignored, ...rest }) => {
    void _ignored;
    return rest;
  });
}
