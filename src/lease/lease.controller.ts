import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseService } from './lease.service';

@Controller('leases')
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  /**
   * Latest saved lease + analysis for a property (must belong to portfolio_id).
   * GET /v1/leases/by-property/:propertyId/latest?portfolio_id=prt_...
   */
  @Get('by-property/:propertyId/latest')
  getLatestForProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.getLatestForPortfolioProperty(
      pid,
      propertyId.trim(),
    );
  }

  /**
   * List main leases + amendments for a property (grouped by status).
   * GET /v1/leases/by-property/:propertyId/documents?portfolio_id=prt_...
   */
  @Get('by-property/:propertyId/documents')
  listDocumentsForProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.listDocumentsForPortfolioProperty(
      pid,
      propertyId.trim(),
    );
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
   */
  @Get('by-property/:propertyId/effective-state')
  getEffectiveStateByProperty(
    @Param('propertyId') propertyId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    const pid = portfolioId?.trim();
    if (!pid) {
      throw new BadRequestException(
        'Query parameter portfolio_id is required',
      );
    }
    return this.leaseService.getEffectiveStateByProperty(
      pid,
      propertyId.trim(),
    );
  }

  /**
   * List all amendments for a lease.
   * GET /v1/leases/:leaseId/amendments
   */
  @Get(':leaseId/amendments')
  listAmendments(@Param('leaseId') leaseId: string) {
    return this.leaseService.listAmendments(leaseId.trim());
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateLeaseDto) {
    return this.leaseService.create(body);
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
