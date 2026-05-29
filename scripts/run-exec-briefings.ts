/**
 * Generate the executive briefing on demand — without waiting for the
 * Monday 6 AM cron. Boots the Nest application context so it reuses the same
 * ExecBriefingService code path the scheduler uses, then upserts a briefing
 * for every org (or one, if you pass an orgId).
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npx tsx scripts/run-exec-briefings.ts            # all orgs
 *   npx tsx scripts/run-exec-briefings.ts org_abc    # one org by orgId
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExecBriefingService } from '../src/exec-briefing/exec-briefing.service';
import { OrganizationsService } from '../src/organizations/organizations.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const log = new Logger('run-exec-briefings');
  const onlyOrgId = process.argv[2]?.trim();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const execBriefings = app.get(ExecBriefingService);
    const orgsService = app.get(OrganizationsService);

    const orgs = onlyOrgId
      ? await orgsService.findByOrgId(onlyOrgId).then((o) => (o ? [o] : []))
      : await orgsService.listAll();

    if (orgs.length === 0) {
      log.warn(onlyOrgId ? `No org found: ${onlyOrgId}` : 'No organizations found.');
      return;
    }

    const now = new Date();
    for (const org of orgs) {
      const timezone = org.timezone || 'America/New_York';
      const briefing = await execBriefings.generateForOrg(org.orgId, {
        timezone,
        now,
        force: true,
      });
      log.log(
        `${org.orgId} (${org.name}): ` +
          `whatsWorking=${briefing.whatsWorking.length}, ` +
          `zoomIn=${briefing.zoomIn.length}, ` +
          `questions=${briefing.questions.length}`,
      );
      log.log(`  headline → ${briefing.headline}`);
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
