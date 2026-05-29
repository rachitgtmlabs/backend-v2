import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getGeneralDashboard(orgId: string | undefined, portfolioId?: string, recentFilter?: string): Promise<{
        reminders: {
            count: number;
            items: {
                id: string;
                title: string;
                severity: import("../tasks-alerts/schemas/task-alert.schema").TaskAlertSeverity;
                due_timeline: string;
                property_name: string;
            }[];
        };
        recentProperties: {
            id: string;
            property_name: string;
            address: string;
            thumbnail_url: string | null;
        }[];
        tasks: {
            id: string;
            title: string;
            severity: import("../tasks-alerts/schemas/task-alert.schema").TaskAlertSeverity;
            is_resolved: boolean;
            property_name: string;
        }[];
        accounting: {
            income: number;
            expenses: number;
            overdue: number;
            chartGranularity: string;
            years: string[];
            chartData: {
                [x: string]: string | number;
                month: string;
            }[];
        };
        rent: {
            chartGranularity: string;
            years: string[];
            chartData: {
                [x: string]: string | number;
                month: string;
            }[];
        };
    }>;
    getAnalyticsDashboard(orgId: string | undefined, portfolioId?: string): Promise<{
        kpis: {
            totalProperties: {
                value: number;
                change: number;
            };
            totalTenants: {
                value: number;
                change: number;
            };
            occupancyRate: {
                value: number;
                change: number;
            };
            atRiskProperties: {
                value: number;
            };
            expiringLeases90d: {
                value: number;
            };
        };
        leaseExpiryTimeline: {
            propertyName: any;
            suite: any;
            startDate: string;
            endDate: string;
            riskLevel: string;
        }[];
        criticalDocuments: {
            propertyId: string;
            propertyName: string;
            documentType: string;
            daysOverdue: number;
            leaseId: null;
        }[];
        revenueByProperty: {
            propertyId: string;
            propertyName: string;
            revenue: number;
            currency: string;
        }[];
        camRecovery: {
            efficiency: number;
            recovered: number;
        };
        riskHeatmap: {
            propertyId: any;
            propertyName: any;
            leaseRisk: number;
            financialRisk: number;
            complianceRisk: number;
        }[];
    }>;
}
