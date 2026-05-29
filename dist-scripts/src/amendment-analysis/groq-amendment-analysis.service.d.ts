import { ConfigService } from '@nestjs/config';
import type { LeaseAnalysisSection } from '../lease-analysis/lease-analysis.mocks';
export interface AmendmentSectionExtractOptions {
    previousSectionJson: unknown;
}
export declare class GroqAmendmentAnalysisService {
    private readonly config;
    private static readonly GROQ_BACKOFF_MAX_ATTEMPTS;
    private static readonly GROQ_BACKOFF_BASE_MS;
    private static readonly GROQ_BACKOFF_MAX_MS;
    private static readonly GROQ_BACKOFF_JITTER_MS;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService);
    ensureConfigured(): void;
    private jsonSchemaStrictEnabled;
    private runGroqWithBackoff;
    extractSectionDelta(section: LeaseAnalysisSection, ocrPlainText: string, options: AmendmentSectionExtractOptions): Promise<unknown>;
    extractCamReviewDelta(ocrPlainText: string, previousCamJson: unknown): Promise<unknown>;
    extractOperationalGuardrailsDelta(ocrPlainText: string, previousSectionJson: unknown): Promise<unknown>;
}
