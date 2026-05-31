import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { DashboardService } from '../dashboard/dashboard.service';
import { Lease } from '../lease/schemas/lease.schema';
import { MailService } from '../mail/mail.service';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { UsersService } from '../users/users.service';
import {
  BriefingItem,
  DailyBriefing,
  DailyBriefingDocument,
} from './schemas/daily-briefing.schema';

/** How many attention items the briefing surfaces. */
const MAX_ITEMS = 5;
/** Severity buckets that count as "needs you today". */
const ATTENTION_SEVERITIES = ['critical', 'high'] as const;
const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function newBriefingId(): string {
  return `dbf_${randomBytes(6).toString('hex')}`;
}

/**
 * Resolve "what day and hour is it right now in this timezone" without a
 * date library. Uses the built-in Intl formatter, which knows IANA zones and
 * DST. Returns the local calendar date as "YYYY-MM-DD" and the local hour 0-23.
 */
export function orgLocalParts(
  timezone: string,
  now: Date,
): { date: string; hour: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // en-CA renders the date as YYYY-MM-DD already.
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  // hour "24" can appear at midnight in some engines — normalize to 0.
  const hour = Number(get('hour')) % 24;
  return { date, hour };
}

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    @InjectModel(DailyBriefing.name)
    private readonly briefingModel: Model<DailyBriefingDocument>,
    @InjectModel(Portfolio.name) private readonly portfolioModel: Model<Portfolio>,
    @InjectModel(Lease.name) private readonly leaseModel: Model<Lease>,
    @InjectModel(TaskAlert.name) private readonly taskAlertModel: Model<TaskAlert>,
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  /** Latest `ready` briefing for an org, or null when none exists yet. */
  async getLatest(orgId: string): Promise<DailyBriefingDocument | null> {
    return this.briefingModel
      .findOne({ orgId, status: 'ready' })
      .sort({ generatedAt: -1 })
      .exec();
  }

  /** Same, but throws 404 — convenience for the controller. */
  async getLatestOrThrow(orgId: string): Promise<DailyBriefingDocument> {
    const doc = await this.getLatest(orgId);
    if (!doc) {
      throw new NotFoundException('No briefing has been generated yet');
    }
    return doc;
  }

  /**
   * Email a generated briefing to every opted-in user in its org. Sent
   * individually so recipients don't see each other. No-ops (returns 0) when
   * SMTP is unconfigured or nobody has subscribed. Never throws — a failed
   * send is logged so it can't break the generation/cron flow.
   */
  async sendBriefingEmails(briefing: DailyBriefingDocument): Promise<number> {
    if (!this.mailService.isEnabled()) return 0;
    const subscribers = await this.usersService.findBriefingSubscribers(
      briefing.orgId,
    );
    if (subscribers.length === 0) return 0;

    const subject = `Your daily briefing — ${briefing.briefingDate}`;
    const html = renderBriefingEmailHtml(briefing);
    const text = renderBriefingEmailText(briefing);

    let sent = 0;
    for (const user of subscribers) {
      // Deliver to the user's configured alert email when set, else the login
      // email (set from the Settings page).
      const to = user.alert_email?.trim() || user.email;
      if (!to) continue;
      try {
        await this.mailService.send({ to, subject, html, text });
        sent += 1;
      } catch (err) {
        this.logger.error(
          `Briefing email to ${to} failed: ${(err as Error).message}`,
        );
      }
    }
    if (sent > 0) {
      this.logger.log(`Emailed briefing ${briefing.briefingId} to ${sent} user(s)`);
    }
    return sent;
  }

  /**
   * Gather facts for an org and upsert today's briefing. Idempotent per
   * `{ orgId, briefingDate }`: calling it twice on the same org-local day
   * overwrites in place rather than creating a duplicate. `force` lets a
   * manual run regenerate even if today's row already exists.
   */
  async generateForOrg(
    orgId: string,
    opts: { timezone: string; now: Date; force?: boolean },
  ): Promise<DailyBriefingDocument> {
    const { timezone, now, force } = opts;
    const { date: briefingDate } = orgLocalParts(timezone, now);

    if (!force) {
      const existing = await this.briefingModel
        .findOne({ orgId, briefingDate })
        .exec();
      if (existing) return existing;
    }

    const { stats, items } = await this.gatherFacts(orgId);
    const narrative = renderNarrative(stats, items);

    return this.briefingModel
      .findOneAndUpdate(
        { orgId, briefingDate },
        {
          $set: {
            timezone,
            generatedAt: now,
            stats,
            items,
            narrative,
            status: 'ready',
          },
          $setOnInsert: { briefingId: newBriefingId(), orgId, briefingDate },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /**
   * Pull the numbers the briefing is built from. Reuses DashboardService for
   * portfolio-wide KPIs/callouts (single source of truth), and queries the
   * lease + alert collections directly for the lease count and the attention
   * list. All org-scoped.
   */
  private async gatherFacts(orgId: string): Promise<{
    stats: DailyBriefing['stats'];
    items: BriefingItem[];
  }> {
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
              severity: { $in: ATTENTION_SEVERITIES as unknown as string[] },
            })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const items: BriefingItem[] = alertDocs
      .sort(
        (a, b) =>
          (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )
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

  /** portfolioIds owned by an org (mirrors PortfolioService's org filter). */
  private async orgPortfolioIds(orgId: string): Promise<string[]> {
    const docs = await this.portfolioModel
      .find({ organization_id: orgId })
      .select({ portfolioId: 1, _id: 0 })
      .lean()
      .exec();
    return docs.map((d) => (d as { portfolioId: string }).portfolioId);
  }
}

/**
 * Template narrative. Deliberately string-based for now — step 4 swaps this
 * for a Mastra/Groq agent that rephrases these same numbers. The LLM must
 * never originate a number; it only ever restates what's computed here.
 */
function renderNarrative(
  stats: DailyBriefing['stats'],
  items: BriefingItem[],
): string {
  const leasePhrase = `${stats.leasesChecked} lease${stats.leasesChecked === 1 ? '' : 's'}`;
  const attention =
    stats.needsAttentionCount === 0
      ? 'nothing that needs your attention today'
      : `${stats.needsAttentionCount} item${stats.needsAttentionCount === 1 ? '' : 's'} that need${stats.needsAttentionCount === 1 ? 's' : ''} your attention today`;

  const lines = [
    `Good morning. I checked all ${leasePhrase} across ${stats.unitsCount} units overnight and found ${attention}.`,
  ];
  if (stats.expiringNext12Months > 0) {
    lines.push(
      `${stats.expiringNext12Months} lease${stats.expiringNext12Months === 1 ? '' : 's'} expire within the next 12 months.`,
    );
  }
  if (items.length > 0) {
    lines.push(`Top item: ${items[0].title}.`);
  }
  return lines.join(' ');
}

/** Escape user-derived text before interpolating into the HTML email. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBriefingEmailHtml(b: DailyBriefing): string {
  const stat = (label: string, value: string) =>
    `<td style="padding:12px 14px;background:#FBF8F1;border-radius:8px;vertical-align:top">
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

function renderBriefingEmailText(b: DailyBriefing): string {
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
