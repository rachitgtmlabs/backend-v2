import type { Response } from 'express';
import { GcsThumbnailService } from '../property/gcs-thumbnail.service';
import { GroqAmendmentAnalysisService } from './groq-amendment-analysis.service';
import { OcrExtractionBridgeService } from '../lease-analysis/ocr-extraction-bridge.service';
export interface PreviousAnalysis {
    executiveSummary?: unknown;
    executiveIdentity?: unknown;
    spaceAndPremises?: unknown;
    financialStack?: unknown;
    criticalDeadlines?: unknown;
    operationalGuardrails?: unknown;
    legalNuances?: unknown;
    camReview?: unknown;
}
export declare class AmendmentAnalysisService {
    private readonly ocr;
    private readonly groq;
    private readonly gcs;
    private readonly logger;
    readonly streamOrder: import("../lease-analysis/lease-analysis.mocks").LeaseAnalysisSection[];
    constructor(ocr: OcrExtractionBridgeService, groq: GroqAmendmentAnalysisService, gcs: GcsThumbnailService);
    streamNdjsonAmendmentAnalysis(file: Express.Multer.File, previousAnalysis: PreviousAnalysis, res: Response): Promise<void>;
    private formatOcrTextWithPageMarkers;
    private readUploadBuffer;
    private pruneEmptyProvisionTopics;
    private provisionTopicIsEmpty;
}
