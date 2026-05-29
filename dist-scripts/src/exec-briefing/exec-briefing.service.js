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
var ExecBriefingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecBriefingService = void 0;
exports.orgLocalWeekStart = orgLocalWeekStart;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const exec_briefing_schema_1 = require("./schemas/exec-briefing.schema");
function newExecBriefingId() {
    return `exb_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function orgLocalWeekStart(timezone, now) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    });
    const parts = fmt.formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const weekday = get('weekday');
    const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
    const daysSinceMonday = (dayIndex + 6) % 7;
    const local = new Date(Date.UTC(year, month - 1, day));
    local.setUTCDate(local.getUTCDate() - daysSinceMonday);
    return local.toISOString().slice(0, 10);
}
const MAX_ITEMS_PER_SECTION = 4;
const MAX_QUESTIONS = 4;
const TOP_TENANT_HEAVY_SHARE_PCT = 10;
const HEALTHY_BILLED_SHARE_PCT = 90;
let ExecBriefingService = ExecBriefingService_1 = class ExecBriefingService {
    constructor(execBriefingModel, dashboardService) {
        this.execBriefingModel = execBriefingModel;
        this.dashboardService = dashboardService;
        this.logger = new common_1.Logger(ExecBriefingService_1.name);
    }
    async getLatest(orgId) {
        return this.execBriefingModel
            .findOne({ orgId, status: 'ready' })
            .sort({ generatedAt: -1 })
            .exec();
    }
    async getLatestOrThrow(orgId) {
        const doc = await this.getLatest(orgId);
        if (!doc) {
            throw new common_1.NotFoundException('No executive briefing has been generated yet');
        }
        return doc;
    }
    async generateForOrg(orgId, opts) {
        const { timezone, now, force } = opts;
        const briefingWeekStart = orgLocalWeekStart(timezone, now);
        if (!force) {
            const existing = await this.execBriefingModel
                .findOne({ orgId, briefingWeekStart })
                .exec();
            if (existing)
                return existing;
        }
        const composed = await this.composeBriefing(orgId);
        return this.execBriefingModel
            .findOneAndUpdate({ orgId, briefingWeekStart }, {
            $set: {
                timezone,
                generatedAt: now,
                stats: composed.stats,
                headline: composed.headline,
                summary: composed.summary,
                whatsWorking: composed.whatsWorking,
                zoomIn: composed.zoomIn,
                questions: composed.questions,
                status: 'ready',
            },
            $setOnInsert: {
                briefingId: newExecBriefingId(),
                orgId,
                briefingWeekStart,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .exec();
    }
    async composeBriefing(orgId) {
        const [analytics, cam, overview] = await Promise.all([
            this.dashboardService.getDashboardAnalytics(undefined, orgId),
            this.dashboardService.getDashboardCam(undefined, orgId),
            this.dashboardService.getDashboardOverview(undefined, orgId),
        ]);
        const stats = {
            camBilledYtdUsd: cam.kpis.alreadyBilledThisYearUsd,
            camStillRecoverableUsd: cam.kpis.stillRecoverableUsd,
            outstandingFromTenantsUsd: cam.kpis.outstandingFromTenantsUsd,
            decisionsNeedingInputCount: overview.briefing.needsAttentionCount,
            occupancyPct: analytics.kpis.occupancyPct,
            expiringNext12MonthsCount: analytics.callouts.expiringNext12Months.count,
            expiringAnnualRentAtStakeUsd: analytics.callouts.expiringNext12Months.annualRentAtStakeUsd,
            tenantConcentrationPct: analytics.callouts.tenantConcentration.sharePct,
            tenantConcentrationTopN: analytics.callouts.tenantConcentration.topN,
        };
        const headline = renderHeadline(stats);
        const summary = renderSummary(stats, overview, cam);
        const whatsWorking = pickWhatsWorking(stats, analytics, cam).slice(0, MAX_ITEMS_PER_SECTION);
        const zoomIn = pickZoomIn(stats, cam, overview, analytics).slice(0, MAX_ITEMS_PER_SECTION);
        const questions = pickQuestions(stats, cam, analytics).slice(0, MAX_QUESTIONS);
        return { stats, headline, summary, whatsWorking, zoomIn, questions };
    }
};
exports.ExecBriefingService = ExecBriefingService;
exports.ExecBriefingService = ExecBriefingService = ExecBriefingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(exec_briefing_schema_1.ExecBriefing.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        dashboard_service_1.DashboardService])
], ExecBriefingService);
function renderHeadline(stats) {
    if (stats.camBilledYtdUsd === 0 && stats.camStillRecoverableUsd === 0) {
        return stats.decisionsNeedingInputCount > 0
            ? `${stats.decisionsNeedingInputCount} item${stats.decisionsNeedingInputCount === 1 ? '' : 's'} need${stats.decisionsNeedingInputCount === 1 ? 's' : ''} your input this week.`
            : 'No CAM activity recorded yet for this portfolio.';
    }
    const billed = formatUsdCompact(stats.camBilledYtdUsd);
    const recoverable = formatUsdCompact(stats.camStillRecoverableUsd);
    const decisions = stats.decisionsNeedingInputCount;
    const decisionPart = decisions > 0
        ? ` and ${decisions} decision${decisions === 1 ? '' : 's'} needing your input`
        : '';
    return `Your portfolio is generating ${billed} in CAM recoveries this year, with ${recoverable} still on the table${decisionPart}.`;
}
function renderSummary(stats, overview, cam) {
    const bits = [];
    if (stats.occupancyPct != null) {
        bits.push(`Portfolio occupancy is ${stats.occupancyPct}%`);
    }
    if (stats.expiringNext12MonthsCount > 0) {
        bits.push(`${stats.expiringNext12MonthsCount} lease${stats.expiringNext12MonthsCount === 1 ? '' : 's'} expire in the next 12 months${stats.expiringAnnualRentAtStakeUsd > 0
            ? ` (${formatUsdCompact(stats.expiringAnnualRentAtStakeUsd)} of annual rent at stake)`
            : ''}`);
    }
    if (overview.biggestRisk) {
        bits.push(`${overview.biggestRisk.severity} alert on ${overview.biggestRisk.propertyName}: ${overview.biggestRisk.title.toLowerCase()}`);
    }
    if (stats.outstandingFromTenantsUsd > 0) {
        bits.push(`${formatUsdCompact(stats.outstandingFromTenantsUsd)} outstanding from tenants over 30 days late`);
    }
    if (cam.kpis.billedSharePct >= HEALTHY_BILLED_SHARE_PCT) {
        bits.push(`CAM recovery is at ${cam.kpis.billedSharePct}% of billable`);
    }
    if (bits.length === 0) {
        return 'Everything looks quiet this week — no expirations, recoveries, or open critical alerts.';
    }
    return capitalize(bits.join('. ')) + '.';
}
function pickWhatsWorking(stats, analytics, cam) {
    const items = [];
    if (cam.kpis.billedSharePct >= HEALTHY_BILLED_SHARE_PCT) {
        items.push({
            title: `CAM recovery is at ${cam.kpis.billedSharePct}% portfolio-wide`,
            body: `${formatUsdCompact(cam.kpis.alreadyBilledThisYearUsd)} of ${formatUsdCompact(cam.kpis.totalBillableThisYearUsd)} billed. Above the 90% benchmark — the team is keeping up.`,
            tone: 'positive',
            amountUsd: cam.kpis.alreadyBilledThisYearUsd,
            suggestedAction: null,
            propertyId: null,
            leaseId: null,
        });
    }
    if (stats.occupancyPct != null && stats.occupancyPct >= 85) {
        const expiringContext = stats.expiringNext12MonthsCount > 0
            ? ` despite ${stats.expiringNext12MonthsCount} expiration${stats.expiringNext12MonthsCount === 1 ? '' : 's'} this year`
            : '';
        items.push({
            title: `Occupancy holding at ${stats.occupancyPct}%${expiringContext}`,
            body: 'Retention is keeping pace with new vacancies. Worth a check-in with your asset managers on the playbooks driving renewals.',
            tone: 'positive',
            amountUsd: null,
            suggestedAction: null,
            propertyId: null,
            leaseId: null,
        });
    }
    const topProperty = analytics.revenueByProperty[0];
    if (topProperty && topProperty.sharePct >= 30) {
        items.push({
            title: `${topProperty.propertyName} is ${topProperty.sharePct}% of revenue`,
            body: `${formatUsdCompact(topProperty.annualRentUsd)} annual rent. Your highest-leverage relationship — make sure renewals don't go to the wire.`,
            tone: 'positive',
            amountUsd: topProperty.annualRentUsd,
            suggestedAction: `Tell me more about ${topProperty.propertyName}`,
            propertyId: topProperty.propertyId,
            leaseId: null,
        });
    }
    return items;
}
function pickZoomIn(stats, cam, overview, analytics) {
    const items = [];
    if (overview.biggestRisk) {
        items.push({
            title: overview.biggestRisk.title,
            body: overview.biggestRisk.details ||
                overview.biggestRisk.suggestedAction ||
                'High-severity alert flagged by lease abstraction — needs your call.',
            tone: overview.biggestRisk.severity === 'critical' ? 'critical' : 'concern',
            amountUsd: null,
            suggestedAction: `Brief me on ${overview.biggestRisk.title}`,
            propertyId: overview.biggestRisk.propertyId,
            leaseId: overview.biggestRisk.leaseId,
        });
    }
    const topUnderBilled = cam.moneyOnTheTable
        .filter((r) => r.kind === 'under_billed' && (r.amountUsd ?? 0) >= 10_000)
        .sort((a, b) => (b.amountUsd ?? 0) - (a.amountUsd ?? 0))[0];
    if (topUnderBilled && topUnderBilled.amountUsd != null) {
        items.push({
            title: `Under-billed CAM at ${stripPropertySuffix(topUnderBilled.title)}`,
            body: `${formatUsdCompact(topUnderBilled.amountUsd)} in unrecovered amounts surfaced by the latest reconciliation. ${topUnderBilled.sub}`,
            tone: 'concern',
            amountUsd: topUnderBilled.amountUsd,
            suggestedAction: 'Show me the reconciliation breakdown',
            propertyId: topUnderBilled.propertyId ?? null,
            leaseId: null,
        });
    }
    if (stats.tenantConcentrationPct >= 40 &&
        analytics.topTenants.length > 0) {
        const top = analytics.topTenants[0];
        items.push({
            title: `Tenant concentration is ${stats.tenantConcentrationPct}% (top ${stats.tenantConcentrationTopN})`,
            body: `${top.tenant} alone is ${top.sharePct}% of rent (${formatUsdCompact(top.annualRentUsd)}). Losing them would meaningfully reset cash flow — worth a renewal-strategy conversation.`,
            tone: 'concern',
            amountUsd: top.annualRentUsd,
            suggestedAction: `What's my exposure if ${top.tenant} doesn't renew?`,
            propertyId: null,
            leaseId: top.leaseId,
        });
    }
    if (stats.outstandingFromTenantsUsd >= 25_000) {
        items.push({
            title: `${formatUsdCompact(stats.outstandingFromTenantsUsd)} outstanding past 30 days`,
            body: `Across ${cam.kpis.outstandingFromTenantsCount} invoice${cam.kpis.outstandingFromTenantsCount === 1 ? '' : 's'}. Late fees may apply per lease terms — worth a sweep before month-end.`,
            tone: 'concern',
            amountUsd: stats.outstandingFromTenantsUsd,
            suggestedAction: 'Which tenants are past due over 30 days?',
            propertyId: null,
            leaseId: null,
        });
    }
    if (stats.expiringNext12MonthsCount >= 3 &&
        stats.expiringAnnualRentAtStakeUsd >= 250_000) {
        items.push({
            title: `${stats.expiringNext12MonthsCount} leases expire within 12 months`,
            body: `${formatUsdCompact(stats.expiringAnnualRentAtStakeUsd)} of annual rent at stake. Confirm renewal strategy with your asset managers this quarter.`,
            tone: 'concern',
            amountUsd: stats.expiringAnnualRentAtStakeUsd,
            suggestedAction: 'Show me leases expiring in the next 12 months',
            propertyId: null,
            leaseId: null,
        });
    }
    return items;
}
function pickQuestions(stats, cam, analytics) {
    const questions = [];
    if (stats.tenantConcentrationPct >= 30 && analytics.topTenants.length > 0) {
        const top = analytics.topTenants[0];
        if (top.sharePct >= TOP_TENANT_HEAVY_SHARE_PCT) {
            questions.push(`What's our position on the ${top.tenant} renewal? Do we have backfill candidates if they walk?`);
        }
    }
    if (stats.camStillRecoverableUsd >= 25_000) {
        questions.push(`How much of the ${formatUsdCompact(stats.camStillRecoverableUsd)} in unrecovered CAM can we capture before year-end?`);
    }
    if (stats.outstandingFromTenantsUsd >= 25_000) {
        questions.push(`Why is ${formatUsdCompact(stats.outstandingFromTenantsUsd)} in tenant receivables past 30 days? Are late fees being charged?`);
    }
    if (cam.camByProperty.length >= 2) {
        const sortedByRate = [...cam.camByProperty].sort((a, b) => b.sharePct - a.sharePct);
        const best = sortedByRate[0];
        const worst = sortedByRate[sortedByRate.length - 1];
        if (best.sharePct - worst.sharePct >= 15) {
            questions.push(`Why is ${worst.propertyName}'s CAM recovery ${best.sharePct - worst.sharePct} points below ${best.propertyName}? Resource gap or process gap?`);
        }
    }
    if (stats.expiringNext12MonthsCount >= 5) {
        questions.push(`${stats.expiringNext12MonthsCount} leases roll within 12 months — what's our retention assumption baked into the budget?`);
    }
    return questions;
}
function stripPropertySuffix(title) {
    const idx = title.indexOf(' · ');
    return idx > 0 ? title.slice(0, idx) : title;
}
function formatUsdCompact(n) {
    if (!n || !Number.isFinite(n))
        return '$0';
    if (n >= 1_000_000)
        return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
    if (n >= 1_000)
        return `$${Math.round(n / 1_000)}K`;
    return `$${Math.round(n).toLocaleString('en-US')}`;
}
function capitalize(s) {
    if (!s)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}
//# sourceMappingURL=exec-briefing.service.js.map