import type { Response } from 'express';
import { GcsThumbnailService } from '../property/gcs-thumbnail.service';
import { DraftAddendumDto } from './dto/draft-addendum.dto';
import { ProposedClauseDto } from './dto/proposed-clause.dto';
import { GroqLeaseAnalysisService } from './groq-lease-analysis.service';
import { OcrExtractionBridgeService } from './ocr-extraction-bridge.service';
export declare class LeaseAnalysisService {
    private readonly ocr;
    private readonly groq;
    private readonly gcs;
    private readonly logger;
    readonly streamOrder: import("./lease-analysis.mocks").LeaseAnalysisSection[];
    constructor(ocr: OcrExtractionBridgeService, groq: GroqLeaseAnalysisService, gcs: GcsThumbnailService);
    proposeComplianceReplacement(dto: ProposedClauseDto): Promise<{
        proposedText: string;
    }>;
    draftAddendum(dto: DraftAddendumDto): Promise<{
        markdown: string;
    }>;
    streamNdjsonLeaseAnalysis(file: Express.Multer.File, res: Response): Promise<void>;
    private formatOcrTextWithPageMarkers;
    private pruneEmptyProvisionTopics;
    private provisionTopicIsEmpty;
    private readUploadBuffer;
}
