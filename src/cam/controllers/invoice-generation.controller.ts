import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import {
  CommitInvoicesDto,
  GenerateInvoicesDto,
} from '../dto/generate-invoices.dto';
import { InvoiceGenerationService } from '../services/invoice-generation.service';

@Controller('cam/invoices')
@UseGuards(PortfolioAccessGuard)
export class InvoiceGenerationController {
  constructor(private readonly svc: InvoiceGenerationService) {}

  /**
   * Story 15+16 — preview generated invoices before commit. Reads YTD
   * thresholds, runs the engine, returns the projected invoices. NO writes.
   */
  @Post('generate')
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.svc.preview({
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      session_id: dto.session_id,
    });
  }

  /**
   * Story 19 — commit. Same engine call as preview, but persists
   * invoices (status=committed), updates UnitThreshold YTD counters,
   * and flips source bills to committed.
   */
  @Post('commit')
  commit(@Body() dto: CommitInvoicesDto) {
    return this.svc.commit({
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      session_id: dto.session_id,
      actor: dto.actor,
    });
  }
}
