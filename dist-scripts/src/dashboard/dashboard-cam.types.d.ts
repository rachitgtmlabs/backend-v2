export interface DashboardCamResponse {
    asOfYear: number;
    kpis: {
        totalBillableThisYearUsd: number;
        alreadyBilledThisYearUsd: number;
        billedSharePct: number;
        stillRecoverableUsd: number;
        leasesAffectedByRecoverable: number;
        outstandingFromTenantsUsd: number;
        outstandingFromTenantsCount: number;
    };
    revenueByType: Array<{
        category: string;
        billedUsd: number;
        sharePct: number;
        invoiceCount: number;
    }>;
    moneyOnTheTable: Array<{
        kind: 'under_billed' | 'cam_alert';
        title: string;
        sub: string;
        amountUsd?: number;
        severity: 'critical' | 'high' | 'medium' | 'low';
        propertyId?: string;
    }>;
    camByProperty: Array<{
        propertyId: string;
        propertyName: string;
        billedUsd: number;
        billableUsd: number;
        leftUsd: number;
        sharePct: number;
    }>;
    camRecoveryRate: {
        billedUsd: number;
        billableUsd: number;
        ratePct: number;
    };
    camRisks: Array<{
        itemId: string;
        title: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        details: string;
        propertyId?: string;
    }>;
}
