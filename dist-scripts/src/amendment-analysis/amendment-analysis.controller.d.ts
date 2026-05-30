import type { Response } from 'express';
import { AmendmentAnalysisService } from './amendment-analysis.service';
interface AmendmentAnalysisRequestBody {
    lease_id: string;
    previous_analysis: string;
}
export declare class AmendmentAnalysisController {
    private readonly amendmentAnalysisService;
    private readonly logger;
    constructor(amendmentAnalysisService: AmendmentAnalysisService);
    streamAmendmentAnalysis(file: Express.Multer.File, body: AmendmentAnalysisRequestBody, res: Response): Promise<void>;
}
export {};
