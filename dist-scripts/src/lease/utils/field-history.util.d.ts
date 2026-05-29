export type AmendmentCategory = 'financial' | 'term' | 'party' | 'operational' | 'other';
interface TrackedField {
    path: string;
    label: string;
    group: string;
    category: AmendmentCategory;
}
export declare const TRACKED_FIELDS: TrackedField[];
export interface CitationRef {
    page: number;
    section?: string;
    highlightText?: string;
}
export interface FieldVersionRecord {
    version: number;
    sourceDocId: string;
    sourceLabel: string;
    effectiveDate: string;
    displayValue: string;
    rawValue: unknown;
    citation: CitationRef;
}
export interface FieldHistoryRecord {
    fieldPath: string;
    fieldLabel: string;
    group: string;
    versions: FieldVersionRecord[];
}
export type TimelineEntryKind = 'lease' | 'amendment' | 'drafted_addendum';
export interface AmendmentVersionMetaRecord {
    version: number;
    sourceDocId: string;
    sourceLabel: string;
    effectiveDate: string;
    changedFieldPaths: string[];
    category: AmendmentCategory;
    annotation?: string;
    kind?: TimelineEntryKind;
    sortKey?: number;
    markdown?: string;
    draftRef?: {
        amendmentId?: string;
        draftKey: string;
    };
    editedBy?: string;
}
export interface FieldHistoryPayload {
    leaseId: string;
    versions: AmendmentVersionMetaRecord[];
    fieldHistories: Record<string, FieldHistoryRecord>;
}
export interface DraftedAddendumInput {
    key: string;
    riskTitle: string;
    riskSeverity?: string;
    resolutionLabel?: string;
    markdown?: string;
    generatedAt: string;
}
export interface AmendmentInput {
    amendmentId: string;
    version: number;
    analysisDelta: Record<string, unknown> | undefined;
    effectiveDate: string;
    editedBy?: string | null;
    draftedAddendums?: DraftedAddendumInput[];
}
export interface BuildFieldHistoryInput {
    leaseId: string;
    originalAnalysis: Record<string, unknown>;
    originalEffectiveDate: string;
    amendments: AmendmentInput[];
    originalDraftedAddendums?: DraftedAddendumInput[];
}
export declare function buildFieldHistory(input: BuildFieldHistoryInput): FieldHistoryPayload;
export {};
