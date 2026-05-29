import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentOrgId } from '../auth/decorators/current-user.decorator';
import { PortfolioAccessGuard } from '../auth/guards/portfolio-access.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(PortfolioAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('general')
  async getGeneralDashboard(
    @CurrentOrgId() orgId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
    @Query('recent_filter') recentFilter?: string,
  ) {
    return this.dashboardService.getDashboardGeneral(portfolioId, recentFilter, orgId);
  }

  @Get('analytics')
  async getAnalyticsDashboard(
    @CurrentOrgId() orgId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
  ) {
    return this.dashboardService.getDashboardAnalytics(portfolioId, orgId);
  }

  /**
   * CAM Recoveries tab. Same RBAC contract as `/analytics` (global JWT guard
   * → org-scoped service filter → PortfolioAccessGuard rejects cross-org
   * portfolio_id). Returns billed/billable/recoverable/outstanding KPIs plus
   * per-property and per-category breakdowns.
   */
  @Get('cam')
  async getCamDashboard(
    @CurrentOrgId() orgId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
  ) {
    return this.dashboardService.getDashboardCam(portfolioId, orgId);
  }

  /**
   * Operational Overview tab. Bundles biggest-risk + attention KPIs + open
   * tasks + invoice-vs-payment trend into a single round-trip. Same RBAC
   * contract as the other dashboard endpoints.
   */
  @Get('overview')
  async getOverviewDashboard(
    @CurrentOrgId() orgId: string | undefined,
    @Query('portfolio_id') portfolioId?: string,
  ) {
    return this.dashboardService.getDashboardOverview(portfolioId, orgId);
  }
}
