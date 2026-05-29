"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const property_schema_1 = require("../property/schemas/property.schema");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const property_alert_schema_1 = require("../tasks-alerts/schemas/property-alert.schema");
const portfolio_schema_1 = require("../portfolio/schemas/portfolio.schema");
const unit_schema_1 = require("../unit/schemas/unit.schema");
const tenant_invoice_schema_1 = require("../cam/schemas/tenant-invoice.schema");
const reconciliation_run_schema_1 = require("../cam/schemas/reconciliation-run.schema");
const TENANT_CONCENTRATION_TOP_N = 5;
const TOP_TENANTS_LIMIT = 5;
const REVENUE_BY_PROPERTY_LIMIT = 3;
const EVENTS_TIMELINE_LIMIT = 12;
let DashboardService = class DashboardService {
    constructor(propertyModel, leaseModel, taskAlertModel, propertyAlertModel, portfolioModel, unitModel, tenantInvoiceModel, reconciliationRunModel) {
        this.propertyModel = propertyModel;
        this.leaseModel = leaseModel;
        this.taskAlertModel = taskAlertModel;
        this.propertyAlertModel = propertyAlertModel;
        this.portfolioModel = portfolioModel;
        this.unitModel = unitModel;
        this.tenantInvoiceModel = tenantInvoiceModel;
        this.reconciliationRunModel = reconciliationRunModel;
    }
    async getDashboardGeneral(_portfolioId, _recentFilter, _orgId) {
        return { status: 'not_implemented' };
    }
    async getDashboardAnalytics(portfolioId, orgId) {
        const asOfYear = new Date().getUTCFullYear();
        const portfolioIds = portfolioId
            ? [portfolioId]
            : await this.getAccessiblePortfolioIds(orgId);
        if (portfolioIds.length === 0) {
            return this.emptyResponse(asOfYear);
        }
        const filter = { portfolio_id: { $in: portfolioIds } };
        const [properties, units, leases, propertyAlerts, legacyAlerts] = await Promise.all([
            this.propertyModel.find(filter).lean().exec(),
            this.unitModel.find(filter).lean().exec(),
            this.leaseModel
                .find({ ...filter, status: 'processed' })
                .lean()
                .exec(),
            this.propertyAlertModel
                .find({ ...filter, is_resolved: { $ne: true } })
                .lean()
                .exec(),
            this.taskAlertModel
                .find({ ...filter, category: 'alert', is_resolved: { $ne: true } })
                .lean()
                .exec(),
        ]);
        const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));
        const leaseRows = leases.map((lease) => extractLeaseRow(lease));
        const propertyCount = properties.length;
        const unitsCount = units.length;
        const leasedSqft = sum(leaseRows.map((r) => r.sqft ?? 0));
        const occupiedUnits = units.filter((u) => u.occupancy_status === 'occupied').length;
        const occupancyPct = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : null;
        const avgRentPerSqftUsd = weightedAverage(leaseRows
            .filter((r) => r.rentPerSqft != null && r.sqft != null)
            .map((r) => ({ value: r.rentPerSqft, weight: r.sqft })));
        const avgTermLeftYears = weightedAverage(leaseRows
            .filter((r) => r.termLeftYears != null && r.annualRentUsd != null)
            .map((r) => ({
            value: r.termLeftYears,
            weight: r.annualRentUsd,
        })));
        const expiringRows = leaseRows.filter((r) => r.expiresInDays != null && r.expiresInDays >= 0 && r.expiresInDays <= 365);
        const expiringNext12Months = {
            count: expiringRows.length,
            annualRentAtStakeUsd: Math.round(sum(expiringRows.map((r) => r.annualRentUsd ?? 0))),
        };
        const severeAlerts = [...propertyAlerts, ...legacyAlerts].filter((a) => a.severity === 'critical' || a.severity === 'high');
        const highSeverityRisks = {
            count: severeAlerts.length,
            leasesAffected: new Set(severeAlerts.map((a) => String(a.lease_id))).size,
        };
        const rentByTenant = new Map();
        for (const r of leaseRows) {
            if (!r.annualRentUsd || !r.tenant)
                continue;
            rentByTenant.set(r.tenant, (rentByTenant.get(r.tenant) ?? 0) + r.annualRentUsd);
        }
        const totalAnnualRent = sum(Array.from(rentByTenant.values()));
        const topTenantRents = Array.from(rentByTenant.values())
            .sort((a, b) => b - a)
            .slice(0, TENANT_CONCENTRATION_TOP_N);
        const tenantConcentration = {
            topN: TENANT_CONCENTRATION_TOP_N,
            sharePct: totalAnnualRent > 0
                ? Math.round((sum(topTenantRents) / totalAnnualRent) * 100)
                : 0,
        };
        const eventsTimeline = buildEventsTimeline(leaseRows, asOfYear).slice(0, EVENTS_TIMELINE_LIMIT);
        const revenueByPropertyMap = new Map();
        for (const r of leaseRows) {
            if (!r.annualRentUsd)
                continue;
            revenueByPropertyMap.set(r.propertyId, (revenueByPropertyMap.get(r.propertyId) ?? 0) + r.annualRentUsd);
        }
        const totalPropertyRevenue = sum(Array.from(revenueByPropertyMap.values()));
        const revenueByProperty = Array.from(revenueByPropertyMap.entries())
            .map(([propertyId, annualRentUsd]) => ({
            propertyId,
            propertyName: propertyMap.get(propertyId)
                ?.property_name ?? 'Unknown property',
            annualRentUsd: Math.round(annualRentUsd),
            sharePct: totalPropertyRevenue > 0
                ? Math.round((annualRentUsd / totalPropertyRevenue) * 100)
                : 0,
        }))
            .sort((a, b) => b.annualRentUsd - a.annualRentUsd)
            .slice(0, REVENUE_BY_PROPERTY_LIMIT);
        const topTenants = leaseRows
            .filter((r) => r.annualRentUsd && r.tenant)
            .sort((a, b) => (b.annualRentUsd ?? 0) - (a.annualRentUsd ?? 0))
            .slice(0, TOP_TENANTS_LIMIT)
            .map((r) => ({
            tenant: r.tenant,
            annualRentUsd: Math.round(r.annualRentUsd),
            sharePct: totalAnnualRent > 0
                ? Math.round((r.annualRentUsd / totalAnnualRent) * 100)
                : 0,
            propertyName: propertyMap.get(r.propertyId)
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
                avgRentPerSqftUsd: avgRentPerSqftUsd != null ? Math.round(avgRentPerSqftUsd * 100) / 100 : null,
                avgTermLeftYears: avgTermLeftYears != null ? Math.round(avgTermLeftYears * 10) / 10 : null,
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
    async getDashboardCam(portfolioId, orgId) {
        const asOfYear = new Date().getUTCFullYear();
        const portfolioIds = portfolioId
            ? [portfolioId]
            : await this.getAccessiblePortfolioIds(orgId);
        if (portfolioIds.length === 0) {
            return this.emptyCamResponse(asOfYear);
        }
        const portfolioScope = { portfolio_id: { $in: portfolioIds } };
        const [properties, invoicesThisYear, reconRunsThisYear, cmAlerts,] = await Promise.all([
            this.propertyModel.find(portfolioScope).lean().exec(),
            this.tenantInvoiceModel
                .find({
                ...portfolioScope,
                calendar_year: asOfYear,
                status: 'committed',
            })
                .lean()
                .exec(),
            this.reconciliationRunModel
                .find({ ...portfolioScope, calendar_year: asOfYear })
                .lean()
                .exec(),
            this.propertyAlertModel
                .find({
                ...portfolioScope,
                is_resolved: { $ne: true },
            })
                .lean()
                .exec(),
        ]);
        const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));
        const alreadyBilledThisYearUsd = sumBy(invoicesThisYear, (i) => i.invoice_amount ?? 0);
        const previewRuns = reconRunsThisYear.filter((r) => r.mode === 'preview');
        const stillRecoverableUsd = sumBy(previewRuns, (r) => Math.max(0, r.total_delta ?? 0));
        const leasesAffectedByRecoverable = countDistinctUnitsWithPositiveDelta(previewRuns);
        const totalBillableThisYearUsd = alreadyBilledThisYearUsd + stillRecoverableUsd;
        const billedSharePct = totalBillableThisYearUsd > 0
            ? Math.round((alreadyBilledThisYearUsd / totalBillableThisYearUsd) * 100)
            : 0;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let outstandingFromTenantsUsd = 0;
        let outstandingFromTenantsCount = 0;
        for (const inv of invoicesThisYear) {
            const committedAtMs = inv.committed_at
                ? new Date(inv.committed_at).getTime()
                : null;
            if (committedAtMs == null || committedAtMs > thirtyDaysAgo)
                continue;
            const unpaid = (inv.invoice_amount ?? 0) - (inv.tenant_paid_amount ?? 0);
            if (unpaid > 0.01) {
                outstandingFromTenantsUsd += unpaid;
                outstandingFromTenantsCount += 1;
            }
        }
        const byCategory = new Map();
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
            sharePct: alreadyBilledThisYearUsd > 0
                ? Math.round((amount / alreadyBilledThisYearUsd) * 100)
                : 0,
            invoiceCount: count,
        }))
            .sort((a, b) => b.billedUsd - a.billedUsd);
        const moneyOnTheTable = [];
        for (const run of previewRuns) {
            if ((run.total_delta ?? 0) <= 0)
                continue;
            const propertyName = propertyMap.get(run.property_id)?.property_name ??
                'Unknown property';
            moneyOnTheTable.push({
                kind: 'under_billed',
                title: `${propertyName} · ${run.calendar_year} reconciliation found under-billed amounts`,
                sub: `${run.units_with_discrepancies ?? 0} unit${(run.units_with_discrepancies ?? 0) === 1 ? '' : 's'} affected across ${run.bills_affected ?? 0} bill${(run.bills_affected ?? 0) === 1 ? '' : 's'}. Run a confirmed reconciliation to issue adjustment invoices.`,
                amountUsd: Math.round(run.total_delta ?? 0),
                severity: (run.total_delta ?? 0) >= 25_000
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
        moneyOnTheTable.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) ||
            (b.amountUsd ?? 0) - (a.amountUsd ?? 0));
        const billedByProperty = new Map();
        for (const inv of invoicesThisYear) {
            billedByProperty.set(inv.property_id, (billedByProperty.get(inv.property_id) ?? 0) +
                (inv.invoice_amount ?? 0));
        }
        const stillRecoverableByProperty = new Map();
        for (const run of previewRuns) {
            if ((run.total_delta ?? 0) <= 0)
                continue;
            stillRecoverableByProperty.set(run.property_id, (stillRecoverableByProperty.get(run.property_id) ?? 0) +
                (run.total_delta ?? 0));
        }
        const propertyIds = new Set([
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
                propertyName: propertyMap.get(propertyId)?.property_name ?? 'Unknown property',
                billedUsd: Math.round(billed),
                billableUsd: Math.round(billable),
                leftUsd: Math.round(left),
                sharePct: billable > 0 ? Math.round((billed / billable) * 100) : 0,
            };
        })
            .sort((a, b) => b.billableUsd - a.billableUsd);
        const camRecoveryRate = {
            billedUsd: Math.round(alreadyBilledThisYearUsd),
            billableUsd: Math.round(totalBillableThisYearUsd),
            ratePct: billedSharePct,
        };
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
    async getDashboardOverview(portfolioId, orgId) {
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
        const [properties, leases, units, propertyAlerts, legacyAlertsAndTasks, invoicesThisYear, previewRunsThisYear,] = await Promise.all([
            this.propertyModel.find(portfolioScope).lean().exec(),
            this.leaseModel
                .find({ ...portfolioScope, status: 'processed' })
                .lean()
                .exec(),
            this.unitModel.find(portfolioScope).lean().exec(),
            this.propertyAlertModel
                .find({ ...portfolioScope, is_resolved: { $ne: true } })
                .lean()
                .exec(),
            this.taskAlertModel
                .find({ ...portfolioScope, is_resolved: { $ne: true } })
                .lean()
                .exec(),
            this.tenantInvoiceModel
                .find({
                ...portfolioScope,
                calendar_year: asOfYear,
                status: 'committed',
            })
                .lean()
                .exec(),
            this.reconciliationRunModel
                .find({
                ...portfolioScope,
                calendar_year: asOfYear,
                mode: 'preview',
            })
                .lean()
                .exec(),
        ]);
        const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));
        const newRecoverableUsd = sumBy(previewRunsThisYear, (r) => Math.max(0, r.total_delta ?? 0));
        const openSevereAlerts = propertyAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high');
        const legacyOpenAlerts = legacyAlertsAndTasks.filter((t) => t.category === 'alert');
        const legacyOpenTasks = legacyAlertsAndTasks.filter((t) => t.category === 'task');
        const allOpenAlerts = [...propertyAlerts, ...legacyOpenAlerts];
        const ranked = [...allOpenAlerts].sort((a, b) => severityRank(normaliseSeverity(a.severity)) -
            severityRank(normaliseSeverity(b.severity)));
        const top = ranked[0];
        const biggestRisk = top
            ? {
                itemId: top.itemId,
                title: top.title,
                severity: normaliseSeverity(top.severity),
                propertyId: top.property_id,
                propertyName: propertyMap.get(top.property_id)?.property_name ?? 'Unknown property',
                leaseId: top.lease_id ?? null,
                details: top.details ?? '',
                suggestedAction: top.suggested_action ?? null,
            }
            : null;
        const actionsThisWeek = bucketTasks(legacyOpenTasks);
        const highCount = allOpenAlerts.filter((a) => normaliseSeverity(a.severity) === 'high' ||
            normaliseSeverity(a.severity) === 'critical').length;
        const mediumCount = allOpenAlerts.filter((a) => normaliseSeverity(a.severity) === 'medium').length;
        const nowMs = now.getTime();
        const ninetyTwoDaysMs = nowMs + 92 * 24 * 60 * 60 * 1000;
        const expiringSoonCount = leases.filter((l) => {
            const li = l
                .lease_information?.leaseInformation;
            const leaseTo = li?.leaseTo;
            const raw = leaseTo?.value;
            if (typeof raw !== 'string')
                return false;
            const d = new Date(raw);
            if (isNaN(d.getTime()))
                return false;
            const ts = d.getTime();
            return ts >= nowMs && ts <= ninetyTwoDaysMs;
        }).length;
        const dueSoonAlertCount = allOpenAlerts.filter((a) => {
            const due = a.due_timeline;
            if (!due)
                return false;
            const d = new Date(due);
            if (isNaN(d.getTime()))
                return false;
            const ts = d.getTime();
            return ts >= nowMs && ts <= ninetyTwoDaysMs;
        }).length;
        const moneyTrend = buildMonthlyTrend(invoicesThisYear, asOfYear);
        const doThisWeek = buildDoThisWeek(legacyOpenTasks, openSevereAlerts, propertyMap);
        void units;
        return {
            asOfYear,
            asOfDate,
            briefing: {
                leasesChecked: leases.length,
                unitsCovered: units.length,
                newRecoverableUsd: Math.round(newRecoverableUsd),
                needsAttentionCount: openSevereAlerts.length + legacyOpenAlerts.filter((a) => normaliseSeverity(a.severity) === 'critical' ||
                    normaliseSeverity(a.severity) === 'high').length,
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
    emptyOverviewResponse(asOfYear, asOfDate) {
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
    emptyCamResponse(asOfYear) {
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
    async getAccessiblePortfolioIds(orgId) {
        if (!orgId)
            return [];
        const docs = await this.portfolioModel
            .find({ organization_id: orgId })
            .select({ portfolioId: 1, _id: 0 })
            .lean()
            .exec();
        return docs.map((d) => d.portfolioId);
    }
    emptyResponse(asOfYear) {
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(1, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __param(2, (0, mongoose_1.InjectModel)(task_alert_schema_1.TaskAlert.name)),
    __param(3, (0, mongoose_1.InjectModel)(property_alert_schema_1.PropertyAlert.name)),
    __param(4, (0, mongoose_1.InjectModel)(portfolio_schema_1.Portfolio.name)),
    __param(5, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(6, (0, mongoose_1.InjectModel)(tenant_invoice_schema_1.TenantInvoice.name)),
    __param(7, (0, mongoose_1.InjectModel)(reconciliation_run_schema_1.ReconciliationRun.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DashboardService);
function extractLeaseRow(lease) {
    const li = lease.lease_information?.leaseInformation ?? {};
    const fs = lease.analysis?.financialStack ?? {};
    const now = Date.now();
    const sqft = parseNumber(fieldValue(li.squareFeet));
    const rentPerSqft = parseNumber(fieldValue(li.rentPerSqFt));
    const annualRentFromSchedule = parseNumber(fs.rentSchedule?.[0]?.annualRent);
    const annualRentUsd = annualRentFromSchedule ??
        (sqft != null && rentPerSqft != null ? sqft * rentPerSqft : null);
    const leaseToValue = fieldValue(li.leaseTo);
    const expiresOn = parseDate(leaseToValue);
    const expiresOnIso = expiresOn ? expiresOn.toISOString().slice(0, 10) : null;
    const expiresInDays = expiresOn
        ? Math.round((expiresOn.getTime() - now) / (1000 * 60 * 60 * 24))
        : null;
    const termLeftYears = expiresInDays != null && expiresInDays >= 0
        ? Math.round((expiresInDays / 365) * 10) / 10
        : null;
    return {
        leaseId: lease.leaseId,
        propertyId: lease.property_id,
        fileName: lease.file_name ?? '',
        tenant: extractTenant(lease),
        suite: typeof fieldValue(li.property) === 'string'
            ? fieldValue(li.property)
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
function extractTenant(lease) {
    const li = lease.lease_information?.leaseInformation ?? {};
    const leaseToText = fieldValue(li.leaseTo);
    if (typeof leaseToText === 'string' && leaseToText && !parseDate(leaseToText)) {
        return leaseToText;
    }
    const leaseTitle = fieldValue(li.lease);
    if (typeof leaseTitle === 'string') {
    }
    if (lease.file_name) {
        return lease.file_name.replace(/\.[^.]+$/, '');
    }
    return null;
}
function fieldValue(field) {
    if (field && typeof field === 'object' && 'value' in field) {
        return field.value;
    }
    return field;
}
function parseNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const match = trimmed.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if (!match)
        return null;
    const n = parseFloat(match[0]);
    return Number.isFinite(n) ? n : null;
}
function parseDate(value) {
    if (typeof value !== 'string' || !value.trim())
        return null;
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return null;
    return d;
}
function sum(values) {
    let total = 0;
    for (const v of values)
        total += v;
    return total;
}
function weightedAverage(rows) {
    if (rows.length === 0)
        return null;
    const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
    if (totalWeight <= 0)
        return null;
    const weightedSum = rows.reduce((acc, r) => acc + r.value * r.weight, 0);
    return weightedSum / totalWeight;
}
function buildEventsTimeline(rows, year) {
    const out = [];
    for (const r of rows) {
        const events = [];
        if (r.expiresOnIso && r.expiresOnIso.startsWith(String(year))) {
            events.push({
                type: 'lease_expires',
                date: r.expiresOnIso,
                label: 'Lease expires',
            });
        }
        if (r.rentScheduleRaw && r.expiresOnIso) {
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
    return out.sort((a, b) => (a.events[0]?.date ?? '').localeCompare(b.events[0]?.date ?? ''));
}
function sumBy(rows, fn) {
    let total = 0;
    for (const r of rows)
        total += fn(r) || 0;
    return total;
}
function pickCategoryLabel(inv) {
    if (inv.invoice_kind === 'adjustment')
        return 'Reconciliation adjustments';
    const cat = (inv.expense_category ?? '').trim();
    return cat || 'Uncategorized';
}
function countDistinctUnitsWithPositiveDelta(runs) {
    const units = new Set();
    for (const r of runs) {
        if ((r.total_delta ?? 0) <= 0)
            continue;
        if (r.by_unit && r.by_unit.length > 0) {
            for (const u of r.by_unit) {
                if ((u.delta ?? 0) > 0 && u.unit_id)
                    units.add(u.unit_id);
            }
        }
        else if (r.unit_id) {
            units.add(r.unit_id);
        }
    }
    return units.size;
}
function isCamAlert(a) {
    const type = (a.alert_type ?? '').toLowerCase();
    const title = (a.title ?? '').toLowerCase();
    return (type.includes('cam') ||
        type.includes('opex') ||
        type.includes('operating') ||
        title.includes('cam') ||
        title.includes('opex'));
}
function normaliseSeverity(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') {
        return v;
    }
    return 'medium';
}
function severityRank(s) {
    return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}
const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
function buildMonthlyTrend(invoices, year) {
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
        const history = inv
            .payment_history;
        if (!Array.isArray(history))
            continue;
        for (const entry of history) {
            if (!entry?.paid_at || entry.amount == null)
                continue;
            const d = new Date(entry.paid_at);
            if (isNaN(d.getTime()))
                continue;
            if (d.getUTCFullYear() !== year)
                continue;
            monthly[d.getUTCMonth()].paidUsd += entry.amount;
        }
    }
    const rounded = monthly.map((m) => ({
        month: m.month,
        invoicedUsd: Math.round(m.invoicedUsd),
        paidUsd: Math.round(m.paidUsd),
    }));
    const ytdInvoicedUsd = rounded.reduce((acc, m) => acc + m.invoicedUsd, 0);
    const ytdPaidUsd = rounded.reduce((acc, m) => acc + m.paidUsd, 0);
    const gapUsd = ytdInvoicedUsd - ytdPaidUsd;
    const gapPct = ytdInvoicedUsd > 0 ? Math.round((gapUsd / ytdInvoicedUsd) * 100) : 0;
    return { months: rounded, ytdInvoicedUsd, ytdPaidUsd, gapUsd, gapPct };
}
function bucketTasks(tasks) {
    let bills = 0;
    let renewals = 0;
    let other = 0;
    for (const t of tasks) {
        const title = (t.title ?? '').toLowerCase();
        if (title.includes('bill') || title.includes('invoice') || title.includes('cam')) {
            bills += 1;
        }
        else if (title.includes('renew') ||
            title.includes('option') ||
            title.includes('expir')) {
            renewals += 1;
        }
        else {
            other += 1;
        }
    }
    return {
        totalCount: tasks.length,
        breakdown: { bills, renewals, other },
    };
}
function buildDoThisWeek(tasks, alerts, propertyMap) {
    const items = [];
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
            dueLabel: normaliseSeverity(a.severity) === 'critical' ? 'Today' : 'This week',
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
//# sourceMappingURL=dashboard.service.js.map