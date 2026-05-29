export declare class DraftedAmendmentDto {
    key: string;
    riskTitle: string;
    riskSeverity: 'critical' | 'high' | 'medium' | 'low';
    originalClause: string;
    proposedClause: string;
    resolutionLabel: string;
    resolutionValue: string;
    reminderIso: string | null;
    markdown: string;
    generatedAt: string;
}
