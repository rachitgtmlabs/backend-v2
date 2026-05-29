import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getGeneralDashboard(orgId: string | undefined, portfolioId?: string, recentFilter?: string): Promise<{
        status: string;
    }>;
    getAnalyticsDashboard(orgId: string | undefined, portfolioId?: string): Promise<import("./dashboard-analytics.types").DashboardAnalyticsResponse>;
    getCamDashboard(orgId: string | undefined, portfolioId?: string): Promise<import("./dashboard-cam.types").DashboardCamResponse>;
    getOverviewDashboard(orgId: string | undefined, portfolioId?: string): Promise<import("./dashboard-overview.types").DashboardOverviewResponse>;
}
