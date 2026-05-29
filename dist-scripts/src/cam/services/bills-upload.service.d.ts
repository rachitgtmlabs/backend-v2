import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { OcrExtractionBridgeService } from '../../lease-analysis/ocr-extraction-bridge.service';
import { GcsThumbnailService } from '../../property/gcs-thumbnail.service';
import { BillDocumentModel } from '../schemas/bill.schema';
import { ExpenseCategoriesService } from './expense-categories.service';
export interface UploadResult {
    bills: Record<string, unknown>[];
    skipped: {
        invoice: number;
        unknown: number;
        failed: number;
        total: number;
    };
    pages: number;
}
export declare class BillsUploadService {
    private readonly billModel;
    private readonly ocr;
    private readonly gcs;
    private readonly config;
    private readonly categories;
    private readonly logger;
    private groqClient;
    constructor(billModel: Model<BillDocumentModel>, ocr: OcrExtractionBridgeService, gcs: GcsThumbnailService, config: ConfigService, categories: ExpenseCategoriesService);
    uploadAndExtract(args: {
        portfolio_id: string;
        property_id: string;
        session_id?: string;
        file: Express.Multer.File;
    }): Promise<UploadResult>;
    private ocrPages;
    private persistBill;
    private validateFile;
    private detectMissingFields;
    private runGroqForPage;
}
