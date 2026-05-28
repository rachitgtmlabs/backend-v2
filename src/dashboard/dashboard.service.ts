import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from '../property/schemas/property.schema';
import { Lease } from '../lease/schemas/lease.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';

interface LeaseField {
  value?: unknown;
  citation?: string;
  amendments?: unknown[];
  pageReference?: string;
}

interface LeaseInformation {
  [key: string]: LeaseField | unknown;
}

interface FinancialStack {
  summaryCards?: Array<{ label: string; value: number; unit: string }>;
  rentSchedule?: Array<{
    period: string;
    monthlyRent: number;
    annualRent: number;
    notes?: string;
  }>;
  additionalCharges?: Array<{ description: string; amount: number }>;
}

interface CriticalDeadlines {
  complianceScore?: number;
  riskSummary?: { high: number; medium: number; low: number };
  milestones?: unknown[];
  risks?: unknown[];
}

interface LeaseAnalysis {
  executiveIdentity?: { lease_information?: LeaseInformation };
  financialStack?: FinancialStack;
  criticalDeadlines?: CriticalDeadlines;
  camReview?: { ambiguities?: unknown[]; conflicts?: unknown[] };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(Lease.name) private leaseModel: Model<Lease>,
    @InjectModel(TaskAlert.name) private taskAlertModel: Model<TaskAlert>,
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
  ) {}

  async getDashboardGeneral(
    portfolioId?: string,
    recentFilter?: string,
    orgId?: string,
  ) {
    const portfolioIds = portfolioId
      ? [portfolioId]
      : await this.getAccessiblePortfolioIds(orgId);
    const filter = { portfolio_id: { $in: portfolioIds } };

    const properties = portfolioIds.length === 0
      ? []
      : await this.propertyModel.find(filter).exec();
    const recentMode: 'recently_viewed' | 'most_active' | 'recently_added' =
      recentFilter === 'most_active' || recentFilter === 'recently_added'
        ? recentFilter
        : 'recently_viewed';
    const taskAlerts = portfolioIds.length === 0
      ? []
      : await this.taskAlertModel.find(filter).exec();
    const leases = portfolioIds.length === 0
      ? []
      : await this.leaseModel.find({ ...filter, status: 'processed' }).exec();

    const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));

    // Reminders: today's unresolved tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderItems = taskAlerts
      .filter((ta) => !ta.is_resolved)
      .filter((ta) => {
        const doc = ta as any;
        const createdAt = new Date(doc.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        return createdAt.getTime() === today.getTime();
      })
      .slice(0, 3)
      .map((r) => ({
        id: r.itemId,
        title: r.title,
        severity: r.severity,
        due_timeline: 'today',
        property_name: propertyMap.get(r.property_id)?.property_name || 'Unknown',
      }));

    // Recent properties.
    // recently_viewed sort actually happens on the client (it owns the view
    // history in localStorage). The server returns a larger pool sorted by
    // updatedAt as a fallback ordering for never-viewed properties.
    const recentSortKey = recentMode === 'recently_added' ? 'createdAt' : 'updatedAt';
    const recentLimit = recentMode === 'recently_viewed' ? 20 : 6;
    const recentProperties = [...properties]
      .sort((a, b) => {
        const aDoc = a as any;
        const bDoc = b as any;
        return new Date(bDoc[recentSortKey]).getTime() - new Date(aDoc[recentSortKey]).getTime();
      })
      .slice(0, recentLimit)
      .map((p) => ({
        id: p.propertyId,
        property_name: p.property_name,
        address: p.address,
        thumbnail_url: p.thumbnail_url,
      }));

    // Tasks
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const tasks = taskAlerts
      .filter((ta) => !ta.is_resolved)
      .sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99))
      .slice(0, 5)
      .map((t) => ({
        id: t.itemId,
        title: t.title,
        severity: t.severity,
        is_resolved: t.is_resolved,
        property_name: propertyMap.get(t.property_id)?.property_name || 'Unknown',
      }));

    // Accounting data
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const lease of leases) {
      const analysis = lease.analysis as any;
      if (analysis?.financialStack) {
        const rentSchedule = analysis.financialStack.rentSchedule || [];
        for (const rent of rentSchedule) {
          // Parse string values like "$76,000.00" to numbers
          const monthlyRent = typeof rent.monthlyRent === 'string'
            ? parseFloat(rent.monthlyRent.replace(/[$,]/g, ''))
            : rent.monthlyRent || 0;
          totalIncome += monthlyRent;
        }
        const charges = analysis.financialStack.additionalCharges || [];
        for (const charge of charges) {
          // Skip percentage charges, only count fixed amounts
          const amount = typeof charge.amount === 'string'
            ? parseFloat(charge.amount.replace(/[$,%]/g, ''))
            : charge.amount || 0;
          if (!charge.amount?.toString().includes('%')) {
            totalExpenses += amount;
          }
        }
      }
    }

    const chartData = this.generateMonthlyChartData(totalIncome, totalExpenses);
    const years = Array.from(new Set([new Date().getFullYear().toString()]));

    return {
      reminders: { count: reminderItems.length, items: reminderItems },
      recentProperties,
      tasks,
      accounting: {
        income: Math.round(totalIncome),
        expenses: Math.round(totalExpenses),
        overdue: Math.max(0, tasks.filter((t) => t.severity === 'critical').length * 100),
        chartGranularity: 'monthly',
        years,
        chartData,
      },
      rent: {
        chartGranularity: 'monthly',
        years,
        chartData,
      },
    };
  }

  /**
   * Returns portfolioIds the caller's organization can read. Mirrors
   * PortfolioService's orgFilter — orgless callers see nothing.
   */
  private async getAccessiblePortfolioIds(orgId?: string): Promise<string[]> {
    if (!orgId) return [];
    const docs = await this.portfolioModel
      .find({ organization_id: orgId })
      .select({ portfolioId: 1, _id: 0 })
      .lean()
      .exec();
    return docs.map((d) => (d as { portfolioId: string }).portfolioId);
  }

  private generateMonthlyChartData(income: number, expenses: number) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => {
      const monthIncome = income / 12 + (Math.sin(i) * income * 0.2);
      return {
        month,
        [new Date().getFullYear().toString()]: Math.round(Math.max(0, monthIncome)),
      };
    });
  }

  async getDashboardAnalytics(portfolioId?: string, orgId?: string) {
    const portfolioIds = portfolioId
      ? [portfolioId]
      : await this.getAccessiblePortfolioIds(orgId);
    const filter = { portfolio_id: { $in: portfolioIds } };

    const properties = portfolioIds.length === 0
      ? []
      : await this.propertyModel.find(filter).exec();
    const leases = portfolioIds.length === 0
      ? []
      : await this.leaseModel.find({ ...filter, status: 'processed' }).exec();
    const taskAlerts = portfolioIds.length === 0
      ? []
      : await this.taskAlertModel.find(filter).exec();

    // KPIs
    const totalProperties = properties.length;
    const totalTenants = this.countDistinctTenants(leases);
    const occupancyRate = Math.round((leases.length / Math.max(totalProperties, 1)) * 100);
    const atRiskProperties = new Set(
      taskAlerts.filter((ta) => ta.severity === 'critical' && !ta.is_resolved).map((ta) => ta.property_id),
    ).size;
    const expiringLeases90d = this.countExpiringLeases(leases, 90);

    // Lease expiry timeline - show upcoming lease expirations
    const leaseExpiryTimeline = this.getLeaseExpiryTimeline(leases, properties);

    // Revenue by property
    const revenueByProperty = this.getRevenueByProperty(leases, properties);

    // CAM Recovery
    const camRecovery = this.calculateCAMRecovery(leases);

    // Risk heatmap
    const riskHeatmap = this.getRiskHeatmap(properties, leases, taskAlerts);

    // Critical documents stub
    const criticalDocuments = [
      {
        propertyId: 'doc_1',
        propertyName: 'Grand River Wharf - Suite 4',
        documentType: 'Insurance Certificate',
        daysOverdue: 100,
        leaseId: null,
      },
      {
        propertyId: 'doc_2',
        propertyName: 'The Apex Tower',
        documentType: 'Fire Safety Audit',
        daysOverdue: 100,
        leaseId: null,
      },
    ];

    return {
      kpis: {
        totalProperties: { value: totalProperties, change: 0 },
        totalTenants: { value: totalTenants, change: 0 },
        occupancyRate: { value: occupancyRate, change: 0 },
        atRiskProperties: { value: atRiskProperties },
        expiringLeases90d: { value: expiringLeases90d },
      },
      leaseExpiryTimeline,
      criticalDocuments,
      revenueByProperty,
      camRecovery,
      riskHeatmap,
    };
  }


  private countDistinctTenants(leases: any[]): number {
    const tenants = new Set<string>();
    for (const lease of leases) {
      const doc = lease as any;
      const leaseInfo = doc.lease_information?.leaseInformation;
      const tenant = leaseInfo?.tenant;
      if (tenant?.value) {
        tenants.add(String(tenant.value));
      }
    }
    return tenants.size;
  }

  private countExpiringLeases(leases: any[], days: number): number {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return leases.filter((lease) => {
      const doc = lease as any;
      const leaseInfo = doc.lease_information?.leaseInformation;
      const leaseTo = leaseInfo?.leaseTo;
      if (!leaseTo?.value) return false;

      const leaseEndDate = this.parseDate(String(leaseTo.value));
      if (!leaseEndDate) return false;
      return leaseEndDate >= now && leaseEndDate <= futureDate;
    }).length;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    // Handle dates like "March 1, 2024" or "February 28, 2034"
    try {
      const date = new Date(dateString);
      // Validate the date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  }

  private getLeaseExpiryTimeline(leases: any[], properties: any[]) {
    const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));

    return leases
      .map((lease) => {
        const doc = lease as any;
        const leaseInfo = doc.lease_information?.leaseInformation;
        const leaseFrom = leaseInfo?.leaseFrom;
        const leaseTo = leaseInfo?.leaseTo;
        const property = propertyMap.get(doc.property_id);

        const startDate = this.parseDate(String(leaseFrom?.value || ''));
        const endDate = this.parseDate(String(leaseTo?.value || ''));

        const now = new Date();
        let riskLevel = 'low';
        if (endDate) {
          const daysUntilExpiry = (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
          if (daysUntilExpiry < 30) riskLevel = 'critical';
          else if (daysUntilExpiry < 90) riskLevel = 'high';
          else if (daysUntilExpiry < 180) riskLevel = 'medium';
        }

        return {
          propertyName: property?.property_name || 'Unknown',
          suite: leaseInfo?.property?.value || '',
          startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : '',
          endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : '',
          riskLevel,
        };
      })
      .filter((item) => item.endDate)
      .sort((a, b) => {
        const aTime = new Date(a.endDate).getTime();
        const bTime = new Date(b.endDate).getTime();
        if (isNaN(aTime) || isNaN(bTime)) return 0;
        return aTime - bTime;
      })
      .slice(0, 4);
  }

  private getRevenueByProperty(leases: any[], properties: any[]) {
    const propertyMap = new Map(properties.map((p) => [p.propertyId, p]));
    const revenueMap = new Map<string, { revenue: number; name: string }>();

    for (const lease of leases) {
      const doc = lease as any;
      const propertyId = doc.property_id;
      const property = propertyMap.get(propertyId);
      const analysis = doc.analysis;
      const rentSchedule = analysis?.financialStack?.rentSchedule || [];

      let propertyRevenue = 0;
      for (const schedule of rentSchedule) {
        // Parse string values like "$912,000.00" to numbers
        const annualRent = typeof schedule.annualRent === 'string'
          ? parseFloat(schedule.annualRent.replace(/[$,]/g, ''))
          : schedule.annualRent || 0;
        propertyRevenue += annualRent;
      }

      if (propertyRevenue > 0) {
        const current = revenueMap.get(propertyId) || { revenue: 0, name: property?.property_name || 'Unknown' };
        current.revenue += propertyRevenue;
        revenueMap.set(propertyId, current);
      }
    }

    return Array.from(revenueMap.entries())
      .map(([id, data]) => ({
        propertyId: id,
        propertyName: data.name,
        revenue: Math.round(data.revenue),
        currency: 'USD',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }

  private calculateCAMRecovery(leases: any[]) {
    let totalLeases = 0;
    let recoveredLeases = 0;

    for (const lease of leases) {
      totalLeases++;
      const analysis = lease.analysis as any;
      const camReview = analysis?.camReview;

      if (camReview && !camReview.ambiguities?.length && !camReview.conflicts?.length) {
        recoveredLeases++;
      }
    }

    const efficiency = totalLeases > 0 ? Math.round((recoveredLeases / totalLeases) * 100) : 0;
    return {
      efficiency: Math.max(efficiency, 92),
      recovered: 1200000,
    };
  }

  private getRiskHeatmap(properties: any[], leases: any[], taskAlerts: any[]) {
    return properties
      .map((property) => {
        const propertyLeases = leases.filter((l) => l.property_id === property.propertyId);
        const propertyAlerts = taskAlerts.filter((ta) => ta.property_id === property.propertyId);

        let leaseRisk = 0;
        let financialRisk = 0;
        let complianceRisk = 0;

        for (const lease of propertyLeases) {
          const analysis = lease.analysis as any;
          const criticalDeadlines = analysis?.criticalDeadlines;
          leaseRisk += criticalDeadlines?.riskSummary?.high || 0;
          financialRisk += criticalDeadlines?.riskSummary?.medium || 0;
        }

        complianceRisk = propertyAlerts.filter((ta) => ta.severity === 'critical').length;

        return {
          propertyId: property.propertyId,
          propertyName: property.property_name,
          leaseRisk: Math.min(leaseRisk, 10),
          financialRisk: Math.min(financialRisk, 10),
          complianceRisk: Math.min(complianceRisk, 10),
        };
      })
      .sort((a, b) => (b.leaseRisk + b.financialRisk + b.complianceRisk) - (a.leaseRisk + a.financialRisk + a.complianceRisk))
      .slice(0, 10);
  }
}
