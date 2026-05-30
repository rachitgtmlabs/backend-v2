import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentOrgId } from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from '../organizations/organizations.service';
import { ExecBriefingService } from './exec-briefing.service';
import { ExecBriefingDocument } from './schemas/exec-briefing.schema';

/** Strip Mongoose internals before sending over the wire. */
function toWire(doc: ExecBriefingDocument) {
  return {
    briefingId: doc.briefingId,
    briefingWeekStart: doc.briefingWeekStart,
    timezone: doc.timezone,
    generatedAt: doc.generatedAt.toISOString(),
    stats: doc.stats,
    headline: doc.headline,
    summary: doc.summary,
    whatsWorking: doc.whatsWorking,
    zoomIn: doc.zoomIn,
    questions: doc.questions,
    status: doc.status,
  };
}

@Controller('exec-briefings')
export class ExecBriefingController {
  constructor(
    private readonly execBriefings: ExecBriefingService,
    private readonly orgs: OrganizationsService,
  ) {}

  /**
   * GET /v1/exec-briefings/latest
   * Most recent ready exec briefing for the caller's org. 404 until the first
   * run — the frontend renders an empty state in that case.
   */
  @Get('latest')
  async latest(@CurrentOrgId() orgId: string | undefined) {
    if (!orgId) throw new BadRequestException('No organization on this account');
    const doc = await this.execBriefings.getLatestOrThrow(orgId);
    return toWire(doc);
  }

  /**
   * POST /v1/exec-briefings/run
   * Manually (re)generate this week's briefing — for testing and on-demand
   * refresh, without waiting for Monday 6 AM. Scoped to the caller's org.
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@CurrentOrgId() orgId: string | undefined) {
    if (!orgId) throw new BadRequestException('No organization on this account');
    const org = await this.orgs.findByOrgId(orgId);
    const timezone = org?.timezone || 'America/New_York';
    const doc = await this.execBriefings.generateForOrg(orgId, {
      timezone,
      now: new Date(),
      force: true,
    });
    return toWire(doc);
  }
}
