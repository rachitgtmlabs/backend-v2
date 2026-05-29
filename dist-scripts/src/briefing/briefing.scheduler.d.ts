import { OrganizationsService } from '../organizations/organizations.service';
import { BriefingService } from './briefing.service';
export declare class BriefingScheduler {
    private readonly orgs;
    private readonly briefings;
    private readonly logger;
    constructor(orgs: OrganizationsService, briefings: BriefingService);
    tick(): Promise<void>;
}
