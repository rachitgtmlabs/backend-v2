import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { SuperadminService } from './superadmin.service';

/**
 * Superadmin surface (global prefix → /v1/superadmin/...). Every route is
 * gated by SuperadminGuard (email allowlist; see auth/superadmin.config.ts) on
 * top of the global JwtAuthGuard.
 */
@Controller('superadmin')
@UseGuards(SuperadminGuard)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  /** Lightweight check the frontend uses to confirm superadmin access. */
  @Get('me')
  me() {
    return { isSuperadmin: true };
  }

  /** All organizations with their settings and live usage counts. */
  @Get('organizations')
  listOrganizations() {
    return this.superadminService.listOrganizations();
  }

  /** Update one org's quotas / feature flags; returns the refreshed view. */
  @Patch('organizations/:orgId/settings')
  updateSettings(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrgSettingsDto,
  ) {
    return this.superadminService.updateSettings(orgId, dto);
  }
}
