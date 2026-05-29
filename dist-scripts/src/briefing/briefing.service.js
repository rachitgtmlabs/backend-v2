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
var BriefingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriefingService = void 0;
exports.orgLocalParts = orgLocalParts;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const mail_service_1 = require("../mail/mail.service");
const portfolio_schema_1 = require("../portfolio/schemas/portfolio.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const users_service_1 = require("../users/users.service");
const daily_briefing_schema_1 = require("./schemas/daily-briefing.schema");
const MAX_ITEMS = 5;
const ATTENTION_SEVERITIES = ['critical', 'high'];
const SEVERITY_RANK = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};
function newBriefingId() {
    return `dbf_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function orgLocalParts(timezone, now) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const hour = Number(get('hour')) % 24;
    return { date, hour };
}
let BriefingService = BriefingService_1 = class BriefingService {
    constructor(briefingModel, portfolioModel, leaseModel, taskAlertModel, dashboardService, usersService, mailService) {
        this.briefingModel = briefingModel;
        this.portfolioModel = portfolioModel;
        this.leaseModel = leaseModel;
        this.taskAlertModel = taskAlertModel;
        this.dashboardService = dashboardService;
        this.usersService = usersService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(BriefingService_1.name);
    }
    async getLatest(orgId) {
        return this.briefingModel
            .findOne({ orgId, status: 'ready' })
            .sort({ generatedAt: -1 })
            .exec();
    }
    async getLatestOrThrow(orgId) {
        const doc = await this.getLatest(orgId);
        if (!doc) {
            throw new common_1.NotFoundException('No briefing has been generated yet');
        }
        return doc;
    }
    async sendBriefingEmails(briefing) {
        if (!this.mailService.isEnabled())
            return 0;
        const subscribers = await this.usersService.findBriefingSubscribers(briefing.orgId);
        if (subscribers.length === 0)
            return 0;
        const subject = `Your daily briefing — ${briefing.briefingDate}`;
        const html = renderBriefingEmailHtml(briefing);
        const text = renderBriefingEmailText(briefing);
        let sent = 0;
        for (const user of subscribers) {
            if (!user.email)
                continue;
            try {
                await this.mailService.send({ to: user.email, subject, html, text });
                sent += 1;
            }
            catch (err) {
                this.logger.error(`Briefing email to ${user.email} failed: ${err.message}`);
            }
        }
        if (sent > 0) {
            this.logger.log(`Emailed briefing ${briefing.briefingId} to ${sent} user(s)`);
        }
        return sent;
    }
    async generateForOrg(orgId, opts) {
        const { timezone, now, force } = opts;
        const { date: briefingDate } = orgLocalParts(timezone, now);
        if (!force) {
            const existing = await this.briefingModel
                .findOne({ orgId, briefingDate })
                .exec();
            if (existing)
                return existing;
        }
        const { stats, items } = await this.gatherFacts(orgId);
        const narrative = renderNarrative(stats, items);
        return this.briefingModel
            .findOneAndUpdate({ orgId, briefingDate }, {
            $set: {
                timezone,
                generatedAt: now,
                stats,
                items,
                narrative,
                status: 'ready',
            },
            $setOnInsert: { briefingId: newBriefingId(), orgId, briefingDate },
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .exec();
    }
    async gatherFacts(orgId) {
        const portfolioIds = await this.orgPortfolioIds(orgId);
        const [analytics, leasesChecked, alertDocs] = await Promise.all([
            this.dashboardService.getDashboardAnalytics(undefined, orgId),
            portfolioIds.length
                ? this.leaseModel.countDocuments({
                    portfolio_id: { $in: portfolioIds },
                    status: 'processed',
                })
                : Promise.resolve(0),
            portfolioIds.length
                ? this.taskAlertModel
                    .find({
                    portfolio_id: { $in: portfolioIds },
                    is_resolved: { $ne: true },
                    severity: { $in: ATTENTION_SEVERITIES },
                })
                    .lean()
                    .exec()
                : Promise.resolve([]),
        ]);
        const items = alertDocs
            .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .slice(0, MAX_ITEMS)
            .map((a) => ({
            title: a.title,
            details: a.details,
            severity: a.severity,
            leaseId: a.lease_id ?? null,
            propertyId: a.property_id ?? null,
        }));
        return {
            stats: {
                leasesChecked,
                unitsCount: analytics.kpis.unitsCount,
                propertyCount: analytics.kpis.propertyCount,
                expiringNext12Months: analytics.callouts.expiringNext12Months.count,
                needsAttentionCount: items.length,
            },
            items,
        };
    }
    async orgPortfolioIds(orgId) {
        const docs = await this.portfolioModel
            .find({ organization_id: orgId })
            .select({ portfolioId: 1, _id: 0 })
            .lean()
            .exec();
        return docs.map((d) => d.portfolioId);
    }
};
exports.BriefingService = BriefingService;
exports.BriefingService = BriefingService = BriefingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(daily_briefing_schema_1.DailyBriefing.name)),
    __param(1, (0, mongoose_1.InjectModel)(portfolio_schema_1.Portfolio.name)),
    __param(2, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __param(3, (0, mongoose_1.InjectModel)(task_alert_schema_1.TaskAlert.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        dashboard_service_1.DashboardService,
        users_service_1.UsersService,
        mail_service_1.MailService])
], BriefingService);
function renderNarrative(stats, items) {
    const leasePhrase = `${stats.leasesChecked} lease${stats.leasesChecked === 1 ? '' : 's'}`;
    const attention = stats.needsAttentionCount === 0
        ? 'nothing that needs your attention today'
        : `${stats.needsAttentionCount} item${stats.needsAttentionCount === 1 ? '' : 's'} that need${stats.needsAttentionCount === 1 ? 's' : ''} your attention today`;
    const lines = [
        `Good morning. I checked all ${leasePhrase} across ${stats.unitsCount} units overnight and found ${attention}.`,
    ];
    if (stats.expiringNext12Months > 0) {
        lines.push(`${stats.expiringNext12Months} lease${stats.expiringNext12Months === 1 ? '' : 's'} expire within the next 12 months.`);
    }
    if (items.length > 0) {
        lines.push(`Top item: ${items[0].title}.`);
    }
    return lines.join(' ');
}
function esc(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function renderBriefingEmailHtml(b) {
    const stat = (label, value) => `<td style="padding:12px 14px;background:#FBF8F1;border-radius:8px;vertical-align:top">
      <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.3px">${esc(label)}</div>
      <div style="font-size:16px;font-weight:600;color:#1F2A37;margin-top:4px">${esc(value)}</div>
    </td>`;
    const itemsHtml = b.items.length
        ? `<ul style="margin:8px 0 0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6">
        ${b.items
            .map((i) => `<li><strong style="color:#1F2A37">${esc(i.title)}</strong>${i.details ? ` — ${esc(i.details)}` : ''}</li>`)
            .join('')}
      </ul>`
        : '<div style="font-size:13px;color:#475569">Nothing needs your attention today.</div>';
    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1F2A37">
    <div style="padding:18px 20px;border:1px solid #E5E7EB;border-left:3px solid #3F4E5E;border-radius:12px;background:#FFFFFF">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">Daily briefing</div>
      <div style="font-size:11px;color:#94A3B8;margin-bottom:14px">${esc(b.briefingDate)}</div>
      <div style="font-size:14px;line-height:1.6;margin-bottom:16px">${esc(b.narrative)}</div>
      <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:16px"><tr>
        ${stat('Checked overnight', `${b.stats.leasesChecked} leases · ${b.stats.unitsCount} units`)}
        ${stat('Expiring soon', `${b.stats.expiringNext12Months} leases`)}
        ${stat('Needs you today', `${b.stats.needsAttentionCount} items`)}
      </tr></table>
      ${itemsHtml}
    </div>
    <div style="font-size:11px;color:#94A3B8;text-align:center;margin-top:14px">
      You're receiving this because you turned on daily briefing emails in LeaseIQ.
    </div>
  </div>`;
}
function renderBriefingEmailText(b) {
    const lines = [
        `Daily briefing — ${b.briefingDate}`,
        '',
        b.narrative,
        '',
        `Checked overnight: ${b.stats.leasesChecked} leases · ${b.stats.unitsCount} units`,
        `Expiring soon: ${b.stats.expiringNext12Months} leases`,
        `Needs you today: ${b.stats.needsAttentionCount} items`,
    ];
    if (b.items.length) {
        lines.push('', 'Needs your attention:');
        for (const i of b.items) {
            lines.push(`- ${i.title}${i.details ? ` — ${i.details}` : ''}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=briefing.service.js.map