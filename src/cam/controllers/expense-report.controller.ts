import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { PortfolioAccessGuard } from '../../auth/guards/portfolio-access.guard';
import { ExpenseReportService } from '../services/expense-report.service';
import { requireQuery } from '../utils/require-query';

@Controller('cam/report')
@UseGuards(PortfolioAccessGuard)
export class ExpenseReportController {
  constructor(private readonly svc: ExpenseReportService) {}

  /**
   * Story 24+25 — invoiced amounts by category. Default scope is whole
   * property; pass unit_id to drill down to a single unit. Default
   * timeline is current calendar year (25).
   */
  @Get('by-category')
  byCategory(
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('unit_id') unitId: string | undefined,
    @Query('year') year: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    const currentYear = new Date().getUTCFullYear();
    return this.svc.reportByCategory({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: requireQuery(propertyId, 'property_id'),
      unit_id: unitId?.trim() || undefined,
      calendar_year: year
        ? Number(year)
        : from || to
          ? undefined
          : currentYear,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /** Story 26 — drill from category card into invoice list. */
  @Get('category/:category')
  drilldown(
    @Param('category') category: string,
    @Query('portfolio_id') portfolioId: string | undefined,
    @Query('property_id') propertyId: string | undefined,
    @Query('unit_id') unitId: string | undefined,
    @Query('year') year: string | undefined,
  ) {
    return this.svc.drilldown({
      portfolio_id: requireQuery(portfolioId, 'portfolio_id'),
      property_id: requireQuery(propertyId, 'property_id'),
      category: decodeURIComponent(category),
      unit_id: unitId?.trim() || undefined,
      calendar_year: year ? Number(year) : undefined,
    });
  }
}
