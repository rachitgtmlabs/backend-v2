import type { Response } from 'express';
import { DraftAddendumDto } from './dto/draft-addendum.dto';
import { ProposedClauseDto } from './dto/proposed-clause.dto';
import { LeaseAnalysisService } from './lease-analysis.service';
export declare class LeaseAnalysisController {
    private readonly leaseAnalysisService;
    private readonly logger;
    constructor(leaseAnalysisService: LeaseAnalysisService);
    proposeComplianceReplacement(body: ProposedClauseDto): Promise<{
        proposedText: string;
    }>;
    draftAddendum(body: DraftAddendumDto): Promise<{
        markdown: string;
    }>;
    streamLeaseAnalysis(file: Express.Multer.File, res: Response): Promise<void>;
}
