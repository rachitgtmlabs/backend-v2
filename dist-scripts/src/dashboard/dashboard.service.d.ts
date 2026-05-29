import { Model } from 'mongoose';
import { Property } from '../property/schemas/property.schema';
import { Lease } from '../lease/schemas/lease.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { PropertyAlert } from '../tasks-alerts/schemas/property-alert.schema';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { Unit } from '../unit/schemas/unit.schema';
import { TenantInvoice } from '../cam/schemas/tenant-invoice.schema';
import { ReconciliationRun } from '../cam/schemas/reconciliation-run.schema';
import type { DashboardAnalyticsResponse } from './dashboard-analytics.types';
import type { DashboardCamResponse } from './dashboard-cam.types';
import type { DashboardOverviewResponse } from './dashboard-overview.types';
export declare class DashboardService {
    private propertyModel;
    private leaseModel;
    private taskAlertModel;
    private propertyAlertModel;
    private portfolioModel;
    private unitModel;
    private tenantInvoiceModel;
    private reconciliationRunModel;
    constructor(propertyModel: Model<Property>, leaseModel: Model<Lease>, taskAlertModel: Model<TaskAlert>, propertyAlertModel: Model<PropertyAlert>, portfolioModel: Model<Portfolio>, unitModel: Model<Unit>, tenantInvoiceModel: Model<TenantInvoice>, reconciliationRunModel: Model<ReconciliationRun>);
    getDashboardGeneral(_portfolioId?: string, _recentFilter?: string, _orgId?: string): Promise<{
        status: string;
    }>;
    getDashboardAnalytics(portfolioId?: string, orgId?: string): Promise<DashboardAnalyticsResponse>;
    getDashboardCam(portfolioId?: string, orgId?: string): Promise<DashboardCamResponse>;
    getDashboardOverview(portfolioId?: string, orgId?: string): Promise<DashboardOverviewResponse>;
    private emptyOverviewResponse;
    private emptyCamResponse;
    private getAccessiblePortfolioIds;
    private emptyResponse;
}
