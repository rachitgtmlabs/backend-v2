import { OrganizationsService } from '../organizations/organizations.service';
import { ExecBriefingService } from './exec-briefing.service';
export declare class ExecBriefingScheduler {
    private readonly orgs;
    private readonly execBriefings;
    private readonly logger;
    constructor(orgs: OrganizationsService, execBriefings: ExecBriefingService);
    tick(): Promise<void>;
}
