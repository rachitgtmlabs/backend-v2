import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
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
