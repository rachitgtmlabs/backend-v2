import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(PortfolioAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('general')
  async getGeneralDashboard(
    @CurrentUserId() userId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
    @Query('recent_filter') recentFilter?: string,
  ) {
    return this.dashboardService.getDashboardGeneral(portfolioId, recentFilter, userId);
  }

  @Get('analytics')
  async getAnalyticsDashboard(
    @CurrentUserId() userId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
  ) {
    return this.dashboardService.getDashboardAnalytics(portfolioId, userId);
  }
}
