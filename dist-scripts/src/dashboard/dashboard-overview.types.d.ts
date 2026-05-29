export interface DashboardOverviewResponse {
    asOfYear: number;
    asOfDate: string;
    briefing: {
        leasesChecked: number;
        unitsCovered: number;
        newRecoverableUsd: number;
        needsAttentionCount: number;
    };
    biggestRisk: {
        itemId: string;
        title: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        propertyId: string;
        propertyName: string;
        leaseId: string | null;
        details: string;
        suggestedAction: string | null;
    } | null;
    actionsThisWeek: {
        totalCount: number;
        breakdown: {
            bills: number;
            renewals: number;
            other: number;
        };
    };
    attentionCards: {
        underBilledUsd: number;
        risks: {
            high: number;
            medium: number;
        };
        deadlinesThisQuarter: number;
    };
    moneyTrend: {
        months: Array<{
            month: string;
            invoicedUsd: number;
            paidUsd: number;
        }>;
        ytdInvoicedUsd: number;
        ytdPaidUsd: number;
        gapUsd: number;
        gapPct: number;
    };
    doThisWeek: Array<{
        itemId: string;
        title: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        propertyName: string | null;
        propertyId: string | null;
        leaseId: string | null;
        dueLabel: string;
        details: string;
    }>;
}
