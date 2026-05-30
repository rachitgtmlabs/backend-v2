import { OrganizationsService } from '../organizations/organizations.service';
import { ExecBriefingService } from './exec-briefing.service';
export declare class ExecBriefingController {
    private readonly execBriefings;
    private readonly orgs;
    constructor(execBriefings: ExecBriefingService, orgs: OrganizationsService);
    latest(orgId: string | undefined): Promise<{
        briefingId: string;
        briefingWeekStart: string;
        timezone: string;
        generatedAt: string;
        stats: import("./schemas/exec-briefing.schema").ExecBriefingStats;
        headline: string;
        summary: string;
        whatsWorking: import("./schemas/exec-briefing.schema").ExecBriefingItem[];
        zoomIn: import("./schemas/exec-briefing.schema").ExecBriefingItem[];
        questions: string[];
        status: import("./schemas/exec-briefing.schema").ExecBriefingStatus;
    }>;
    run(orgId: string | undefined): Promise<{
        briefingId: string;
        briefingWeekStart: string;
        timezone: string;
        generatedAt: string;
        stats: import("./schemas/exec-briefing.schema").ExecBriefingStats;
        headline: string;
        summary: string;
        whatsWorking: import("./schemas/exec-briefing.schema").ExecBriefingItem[];
        zoomIn: import("./schemas/exec-briefing.schema").ExecBriefingItem[];
        questions: string[];
        status: import("./schemas/exec-briefing.schema").ExecBriefingStatus;
    }>;
}
