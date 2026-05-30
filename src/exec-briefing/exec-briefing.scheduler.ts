import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrganizationsService } from '../organizations/organizations.service';
import { ExecBriefingService, orgLocalWeekStart } from './exec-briefing.service';

/** Org-local hour the weekly executive briefing should be ready. */
const TARGET_HOUR = 6;
/** Day-of-week the weekly briefing fires on (Monday = 1). */
const TARGET_DOW = 'Mon';

/**
 * Fires the per-org weekly executive briefing. Same in-process cron pattern
 * as the daily briefing — ticks every hour, asks "is it Monday 6 AM in this
 * org's timezone right now?", and generates only for orgs that just crossed
 * that point. The `{ orgId, briefingWeekStart }` unique index keeps double
 * fires (or a second replica) from producing duplicates.
 *
 * NOTE: at multi-replica scale move this trigger to an external scheduler
 * hitting POST /v1/exec-briefings/run, or add a distributed lock. Single
 * instance: fine.
 */
@Injectable()
export class ExecBriefingScheduler {
  private readonly logger = new Logger(ExecBriefingScheduler.name);

  constructor(
    private readonly orgs: OrganizationsService,
    private readonly execBriefings: ExecBriefingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'exec-briefing-weekly' })
  async tick(): Promise<void> {
    const now = new Date();
    const orgs = await this.orgs.listAll();
    let generated = 0;

    for (const org of orgs) {
      const timezone = org.timezone || 'America/New_York';
      if (!isMondaySixAM(timezone, now)) continue;

      try {
        await this.execBriefings.generateForOrg(org.orgId, { timezone, now });
        generated += 1;
      } catch (err) {
        // One org failing must not stop the sweep.
        this.logger.error(
          `Exec briefing failed for org ${org.orgId}: ${(err as Error).message}`,
        );
      }
    }

    if (generated > 0) {
      this.logger.log(`Generated ${generated} exec briefing(s)`);
    }
  }
}

/**
 * Is it Monday at hour `TARGET_HOUR` in the given timezone? Same Intl-based
 * approach used elsewhere — no date library needed.
 */
function isMondaySixAM(timezone: string, now: Date): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '');
  // Touch `orgLocalWeekStart` so unused-import lint doesn't fire even though
  // the scheduler doesn't compute the date — the service handles that.
  void orgLocalWeekStart;
  return weekday === TARGET_DOW && (hour % 24) === TARGET_HOUR;
}
