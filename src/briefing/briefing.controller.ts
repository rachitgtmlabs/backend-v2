import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import {
  CurrentOrgId,
  CurrentUser,
  CurrentUserId,
} from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { BriefingService } from './briefing.service';
import { EmailSubscriptionDto } from './dto/email-subscription.dto';
import { DailyBriefingDocument } from './schemas/daily-briefing.schema';

/** Clean wire shape — never leak Mongoose internals (`_id`, `__v`). */
function toWire(doc: DailyBriefingDocument) {
  return {
    briefingId: doc.briefingId,
    briefingDate: doc.briefingDate,
    timezone: doc.timezone,
    generatedAt: doc.generatedAt.toISOString(),
    stats: doc.stats,
    items: doc.items,
    narrative: doc.narrative,
    status: doc.status,
  };
}

@Controller('briefings')
export class BriefingController {
  constructor(
    private readonly briefings: BriefingService,
    private readonly orgs: OrganizationsService,
    private readonly users: UsersService,
  ) {}

  /**
   * GET /v1/briefings/latest
   * Most recent ready briefing for the caller's org. 404 until the first run.
   */
  @Get('latest')
  async latest(@CurrentOrgId() orgId: string | undefined) {
    if (!orgId) throw new BadRequestException('No organization on this account');
    const doc = await this.briefings.getLatestOrThrow(orgId);
    return toWire(doc);
  }

  /**
   * POST /v1/briefings/run
   * Manually (re)generate today's briefing for the caller's org — for testing
   * and on-demand refresh, without waiting for the 6 AM cron. Scoped to the
   * caller's org by the JWT, so it can't touch another org's data.
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@CurrentOrgId() orgId: string | undefined) {
    if (!orgId) throw new BadRequestException('No organization on this account');
    const org = await this.orgs.findByOrgId(orgId);
    const timezone = org?.timezone || 'America/New_York';
    const doc = await this.briefings.generateForOrg(orgId, {
      timezone,
      now: new Date(),
      force: true,
    });
    const emailed = await this.briefings.sendBriefingEmails(doc);
    return { ...toWire(doc), emailed };
  }

  /**
   * GET /v1/briefings/email-subscription
   * Whether the current user receives the daily briefing by email.
   */
  @Get('email-subscription')
  async getSubscription(@CurrentUser('briefingEmailOptIn') optIn: unknown) {
    return { enabled: optIn === true };
  }

  /**
   * PUT /v1/briefings/email-subscription { enabled }
   * Toggle the current user's daily-briefing email subscription. The button
   * on the dashboard card calls this.
   */
  @Put('email-subscription')
  async setSubscription(
    @CurrentUserId() userId: string | undefined,
    @Body() body: EmailSubscriptionDto,
  ) {
    if (!userId) throw new BadRequestException('Not authenticated');
    const enabled = await this.users.setBriefingEmailOptIn(userId, body.enabled);
    return { enabled };
  }
}
