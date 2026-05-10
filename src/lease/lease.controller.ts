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

  @Post()  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateLeaseDto) {
    return this.leaseService.create(body);
  }
}
