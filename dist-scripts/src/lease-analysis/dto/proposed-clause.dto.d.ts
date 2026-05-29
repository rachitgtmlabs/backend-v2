export declare class ProposedClauseDto {
    riskTitle: string;
    originalClause: string;
    jurisdictionSummary: string;
    existingProposedClause?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
}
