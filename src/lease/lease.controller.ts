import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseService } from './lease.service';

@Controller('leases')
@UseGuards(PortfolioAccessGuard)
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  /**
   * Latest saved lease + analysis for a property (must belong to portfolio_id).
   * GET /v1/leases/by-property/:propertyId/latest?portfolio_id=prt_...
   *
   * @deprecated Use `/by-unit/:unitId/latest` once the frontend cutover lands
   * in Phase 3. Returns `multi_unit: true` for multi-unit properties so the
   * caller can route the user to a unit picker. The `Deprecation` response
   * header signals the same to API consumers.
   */
  @Get('by-property/:propertyId/latest')
  async getLatestForProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    res.set('Deprecation', 'true');
    return this.leaseService.getLatestForPortfolioProperty(
      pid,
      propertyId.trim(),
    );
  }

  /**
   * Latest saved lease + analysis for a unit.
   * GET /v1/leases/by-unit/:unitId/latest?portfolio_id=prt_...
   */
  @Get('by-unit/:unitId/latest')
  getLatestForUnit(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.getLatestForPortfolioUnit(pid, unitId.trim());
  }

  /**
   * Proxy a stored lease/amendment PDF from GCS to the client.
   * GET /v1/leases/document?path=documents/leases/...
   */
  @Get('document')
  async getDocument(
    @Query('path') objectPath: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const path = objectPath?.trim();
    if (!path) {
      throw new BadRequestException('Query parameter path is required');
    }
    if (!path.startsWith('documents/')) {
      throw new BadRequestException('Invalid document path');
    }
    const result = await this.leaseService.downloadDocument(path);
    if (!result) {
      throw new NotFoundException('Document not found');
    }
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': 'inline',
    });
    return new StreamableFile(result.buffer);
  }

  /**
   * List main leases + amendments for a property (grouped by status).
   * GET /v1/leases/by-property/:propertyId/documents?portfolio_id=prt_...
   *
   * @deprecated Use `/by-unit/:unitId/documents` after Phase 3.
   */
  @Get('by-property/:propertyId/documents')
  listDocumentsForProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    res.set('Deprecation', 'true');
    return this.leaseService.listDocumentsForPortfolioProperty(
      pid,
      propertyId.trim(),
    );
  }

  /**
   * List main leases + amendments for a unit (grouped by status).
   * GET /v1/leases/by-unit/:unitId/documents?portfolio_id=prt_...
   */
  @Get('by-unit/:unitId/documents')
  listDocumentsForUnit(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.listDocumentsForPortfolioUnit(pid, unitId.trim());
  }

  /**
   * Get effective state of a lease (original lease + all amendments merged).
   * GET /v1/leases/:leaseId/effective-state
   */
  @Get(':leaseId/effective-state')
  getEffectiveState(@Param('leaseId') leaseId: string) {
    return this.leaseService.getEffectiveState(leaseId.trim());
  }

  /**
   * Get effective state by property (finds latest lease, then merges amendments).
   * GET /v1/leases/by-property/:propertyId/effective-state?portfolio_id=prt_...
   *
   * @deprecated Use `/by-unit/:unitId/effective-state` after Phase 3.
   */
  @Get('by-property/:propertyId/effective-state')
  getEffectiveStateByProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    res.set('Deprecation', 'true');
    return this.leaseService.getEffectiveStateByProperty(
      pid,
      propertyId.trim(),
    );
  }

  /**
   * Get effective state by unit (finds latest processed lease for the unit,
   * then merges its amendments).
   * GET /v1/leases/by-unit/:unitId/effective-state?portfolio_id=prt_...
   */
  @Get('by-unit/:unitId/effective-state')
  getEffectiveStateByUnit(
    @Param('unitId') unitId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.getEffectiveStateByUnit(pid, unitId.trim());
  }

  /**
   * List all amendments for a lease.
   * GET /v1/leases/:leaseId/amendments
   */
  @Get(':leaseId/amendments')
  listAmendments(@Param('leaseId') leaseId: string) {
    return this.leaseService.listAmendments(leaseId.trim());
  }

  /**
   * Field-level history for the Timeline view.
   * GET /v1/leases/:leaseId/field-history
   */
  @Get(':leaseId/field-history')
  getFieldHistory(@Param('leaseId') leaseId: string) {
    return this.leaseService.getFieldHistory(leaseId.trim());
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateLeaseDto, @Req() req: Request) {
    const user = (req as Request & { user?: { email?: string; _id?: unknown } })
      .user;
    const userEmail =
      typeof user?.email === 'string' && user.email.trim().length > 0
        ? user.email.trim()
        : null;
    return this.leaseService.create(body, { userEmail });
  }
}

/**
 * Separate controller for amendment-specific endpoints.
 */
@Controller('amendments')
export class AmendmentController {
  constructor(private readonly leaseService: LeaseService) {}

  /**
   * Get a specific amendment by ID.
   * GET /v1/amendments/:amendmentId
   */
  @Get(':amendmentId')
  getAmendment(@Param('amendmentId') amendmentId: string) {
    return this.leaseService.getAmendment(amendmentId.trim());
  }
}
