export interface DashboardAnalyticsResponse {
    kpis: {
        propertyCount: number;
        unitsCount: number;
        leasedSqft: number;
        occupancyPct: number | null;
        avgRentPerSqftUsd: number | null;
        avgTermLeftYears: number | null;
    };
    callouts: {
        expiringNext12Months: {
            count: number;
            annualRentAtStakeUsd: number;
        };
        highSeverityRisks: {
            count: number;
            leasesAffected: number;
        };
        tenantConcentration: {
            topN: number;
            sharePct: number;
        };
    };
    eventsTimeline: Array<{
        tenant: string;
        suite: string;
        propertyId: string | null;
        events: Array<{
            type: 'lease_expires' | 'rent_escalation' | 'renewal_notice' | 'termination_window';
            date: string;
            label: string;
        }>;
    }>;
    revenueByProperty: Array<{
        propertyId: string;
        propertyName: string;
        annualRentUsd: number;
        sharePct: number;
    }>;
    topTenants: Array<{
        tenant: string;
        annualRentUsd: number;
        sharePct: number;
        propertyName: string | null;
        expiresOn: string | null;
        leaseId: string;
    }>;
    asOfYear: number;
}
