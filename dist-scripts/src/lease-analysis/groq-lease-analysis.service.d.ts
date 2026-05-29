import { ConfigService } from '@nestjs/config';
import type { LeaseAnalysisSection } from './lease-analysis.mocks';
export interface ProposeComplianceReplacementInput {
    riskTitle: string;
    originalClause: string;
    jurisdictionSummary: string;
    existingProposedClause?: string;
    severity?: string;
}
export interface DraftAddendumInput {
    riskTitle: string;
    originalClause: string;
    proposedClause: string;
    jurisdictionSummary: string;
    severity?: string;
    leaseTitle?: string;
    landlordName?: string;
    tenantName?: string;
    effectiveDate?: string;
}
export declare class GroqLeaseAnalysisService {
    private readonly config;
    private static readonly GROQ_BACKOFF_MAX_ATTEMPTS;
    private static readonly GROQ_BACKOFF_BASE_MS;
    private static readonly GROQ_BACKOFF_MAX_MS;
    private static readonly GROQ_BACKOFF_JITTER_MS;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService);
    ensureConfigured(): void;
    buildUserContent(ocrPlainText: string, section: LeaseAnalysisSection): string;
    private jsonSchemaStrictEnabled;
    private runGroqWithBackoff;
    extractSectionJson(section: LeaseAnalysisSection, ocrPlainText: string): Promise<unknown>;
    extractOperationalGuardrailsJson(ocrPlainText: string): Promise<unknown>;
    buildCamReviewUserContent(ocrPlainText: string): string;
    extractCamReviewJson(ocrPlainText: string): Promise<unknown>;
    proposeComplianceReplacement(input: ProposeComplianceReplacementInput): Promise<string>;
    draftAddendumMarkdown(input: DraftAddendumInput): Promise<string>;
}
