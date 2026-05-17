import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(PortfolioAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('general')
  async getGeneralDashboard(@Query('portfolio_id') portfolioId?: string) {
    return this.dashboardService.getDashboardGeneral(portfolioId);
  }

  @Get('analytics')
  async getAnalyticsDashboard(@Query('portfolio_id') portfolioId?: string) {
    return this.dashboardService.getDashboardAnalytics(portfolioId);
  }
}
