import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import { ReconcileYearDto } from '../dto/reconcile.dto';
import { ReconciliationRunMode } from '../schemas/reconciliation-run.schema';
import { ReconciliationService } from '../services/reconciliation.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/reconcile')
@UseGuards(PortfolioAccessGuard)
export class ReconciliationController {
  constructor(private readonly svc: ReconciliationService) {}

  /**
   * Audit-reconcile (Reconcile YYYY). Preview by default; pass apply:true
   * to commit adjustment invoices.
   */
  @Post('run')
  run(@Body() dto: ReconcileYearDto) {
    return this.svc.run({
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      calendar_year: dto.calendar_year,
      unit_id: dto.unit_id,
      apply: dto.apply ?? false,
      apply_reason: dto.apply_reason,
      actor: dto.actor,
    });
  }

  /** List historical runs for a property. */
  @Get('runs')
  list(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('year') year: string | undefined,
    @Query('mode') mode: ReconciliationRunMode | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    return this.svc.listRuns({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: propertyId?.trim() || undefined,
      calendar_year: year ? Number(year) : undefined,
      mode,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('runs/:runId')
  getOne(
    @Param('runId') runId: string,
    @Query('portfolio_id') portfolioId: string | undefined,
  ) {
    return this.svc.getRun(requireQuery(portfolioId, 'portfolio_id'), runId);
  }
}
