import {
  Controller,
  ForbiddenException,
  Get,
  Query,
} from '@nestjs/common';
import { CurrentOrgId } from '../auth/decorators/current-user.decorator';
import { LeaseService } from './lease.service';

/**
 * Org-wide Document Vault. Unlike the lease/property/unit endpoints, these are
 * scoped by the caller's organization (via the JWT) rather than a single
 * portfolio_id — so they intentionally do NOT use PortfolioAccessGuard. The
 * global JwtAuthGuard still applies.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly leaseService: LeaseService) {}

  /**
   * GET /v1/documents/drafts — every draft lease + amendment across the org's
   * portfolios. Optional filters: property_id, unit_id, tag.
   */
  @Get('drafts')
  listDrafts(
    @CurrentOrgId() orgId: string | undefined,
    @Query('property_id') propertyId?: string,
    @Query('unit_id') unitId?: string,
    @Query('tag') tag?: string,
  ) {
    if (!orgId) {
      throw new ForbiddenException('No organization context on this account');
    }
    return this.leaseService.listOrgDrafts(orgId, {
      propertyId: propertyId?.trim() || undefined,
      unitId: unitId?.trim() || undefined,
      tag: tag?.trim() || undefined,
    });
  }
}
