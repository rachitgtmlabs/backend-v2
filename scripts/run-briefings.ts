/**
 * Generate the daily briefing on demand — without waiting for the 6 AM cron.
 * Boots the Nest application context (so it reuses BriefingService, the same
 * code path the scheduler uses), generates for every org (force), and sends
 * the email to opted-in users.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npx tsx scripts/run-briefings.ts            # all orgs
 *   npx tsx scripts/run-briefings.ts org_abc123 # one org by orgId
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { BriefingService } from '../src/briefing/briefing.service';
import { OrganizationsService } from '../src/organizations/organizations.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const log = new Logger('run-briefings');
  const onlyOrgId = process.argv[2]?.trim();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const briefings = app.get(BriefingService);
    const orgsService = app.get(OrganizationsService);

    const orgs = onlyOrgId
      ? (await orgsService.findByOrgId(onlyOrgId).then((o) => (o ? [o] : [])))
      : await orgsService.listAll();

    if (orgs.length === 0) {
      log.warn(onlyOrgId ? `No org found: ${onlyOrgId}` : 'No organizations found.');
      return;
    }

    const now = new Date();
    for (const org of orgs) {
      const timezone = org.timezone || 'America/New_York';
      const briefing = await briefings.generateForOrg(org.orgId, {
        timezone,
        now,
        force: true,
      });
      const emailed = await briefings.sendBriefingEmails(briefing);
      log.log(
        `${org.orgId} (${org.name}): ${briefing.stats.leasesChecked} leases, ` +
          `${briefing.stats.needsAttentionCount} attention items, emailed ${emailed} user(s)`,
      );
      log.log(`  → ${briefing.narrative}`);
    }
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
