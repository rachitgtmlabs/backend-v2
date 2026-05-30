export declare class DraftAddendumDto {
    riskTitle: string;
    originalClause: string;
    proposedClause: string;
    jurisdictionSummary: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    leaseTitle?: string;
    landlordName?: string;
    tenantName?: string;
    effectiveDate?: string;
}
