import { Model } from 'mongoose';
import { Property } from '../property/schemas/property.schema';
import { Lease } from '../lease/schemas/lease.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
export declare class DashboardService {
    private propertyModel;
    private leaseModel;
    private taskAlertModel;
    private portfolioModel;
    constructor(propertyModel: Model<Property>, leaseModel: Model<Lease>, taskAlertModel: Model<TaskAlert>, portfolioModel: Model<Portfolio>);
    getDashboardGeneral(portfolioId?: string, recentFilter?: string, orgId?: string): Promise<{
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
    private getAccessiblePortfolioIds;
    private generateMonthlyChartData;
    getDashboardAnalytics(portfolioId?: string, orgId?: string): Promise<{
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
    private countDistinctTenants;
    private countExpiringLeases;
    private parseDate;
    private getLeaseExpiryTimeline;
    private getRevenueByProperty;
    private calculateCAMRecovery;
    private getRiskHeatmap;
}
