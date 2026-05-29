import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface OcrExtractionJson {
    full_text: string;
    pages?: Array<{
        page_number: number;
        text: string;
    }>;
    source_pdf?: string;
    det_arch?: string;
    reco_arch?: string;
    exported?: unknown;
}
export declare class OcrExtractionBridgeService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private readonly projectRoot;
    private readonly scriptPath;
    constructor(config: ConfigService);
    onModuleInit(): void;
    private ocrSubprocessTimeoutMs;
    private resolveSpawnConfig;
    extractTextFromPdfBuffer(buffer: Buffer): Promise<OcrExtractionJson>;
    extractTextFromPdfPath(pdfPath: string): Promise<OcrExtractionJson>;
    private runPythonScript;
}
