import { Model } from 'mongoose';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExecBriefingDocument } from './schemas/exec-briefing.schema';
export declare function orgLocalWeekStart(timezone: string, now: Date): string;
export declare class ExecBriefingService {
    private readonly execBriefingModel;
    private readonly dashboardService;
    private readonly logger;
    constructor(execBriefingModel: Model<ExecBriefingDocument>, dashboardService: DashboardService);
    getLatest(orgId: string): Promise<ExecBriefingDocument | null>;
    getLatestOrThrow(orgId: string): Promise<ExecBriefingDocument>;
    generateForOrg(orgId: string, opts: {
        timezone: string;
        now: Date;
        force?: boolean;
    }): Promise<ExecBriefingDocument>;
    private composeBriefing;
}
