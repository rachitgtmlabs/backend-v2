import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrganizationsService } from '../organizations/organizations.service';
import { BriefingService, orgLocalParts } from './briefing.service';

/** Org-local hour at which the daily briefing should be ready. */
const TARGET_HOUR = 6;

/**
 * Fires the per-org daily briefing. This is an *in-process* cron — it runs
 * inside the Nest app, so no separate scheduler service or deployment is
 * needed; the only requirement is that the backend process stays running.
 *
 * It ticks once an hour rather than once a day so it can honor each org's own
 * timezone: on every tick it asks "is it ~6 AM right now in this org's zone?"
 * and generates only for the orgs that just crossed 6 AM. The
 * `{ orgId, briefingDate }` unique index makes a double-tick (or a second
 * replica) a no-op rather than a duplicate.
 *
 * NOTE: with multiple backend replicas every replica's cron fires. The unique
 * index keeps the *data* correct, but to avoid a duplicate generate (and LLM
 * call) at scale, move this trigger to an external scheduler hitting
 * POST /v1/briefings/run, or add a distributed lock. Single instance: fine.
 */
@Injectable()
export class BriefingScheduler {
  private readonly logger = new Logger(BriefingScheduler.name);

  constructor(
    private readonly orgs: OrganizationsService,
    private readonly briefings: BriefingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'daily-briefing' })
  async tick(): Promise<void> {
    const now = new Date();
    const orgs = await this.orgs.listAll();
    let generated = 0;

    for (const org of orgs) {
      const timezone = org.timezone || 'America/New_York';
      const { hour } = orgLocalParts(timezone, now);
      if (hour !== TARGET_HOUR) continue;

      try {
        const briefing = await this.briefings.generateForOrg(org.orgId, {
          timezone,
          now,
        });
        await this.briefings.sendBriefingEmails(briefing);
        generated += 1;
      } catch (err) {
        // One org failing must not stop the sweep.
        this.logger.error(
          `Daily briefing failed for org ${org.orgId}: ${(err as Error).message}`,
        );
      }
    }

    if (generated > 0) {
      this.logger.log(`Generated ${generated} daily briefing(s)`);
    }
  }
}
