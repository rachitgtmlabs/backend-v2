import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { BriefingService } from './briefing.service';
import { EmailSubscriptionDto } from './dto/email-subscription.dto';
export declare class BriefingController {
    private readonly briefings;
    private readonly orgs;
    private readonly users;
    constructor(briefings: BriefingService, orgs: OrganizationsService, users: UsersService);
    latest(orgId: string | undefined): Promise<{
        briefingId: string;
        briefingDate: string;
        timezone: string;
        generatedAt: string;
        stats: import("./schemas/daily-briefing.schema").BriefingStats;
        items: import("./schemas/daily-briefing.schema").BriefingItem[];
        narrative: string;
        status: import("./schemas/daily-briefing.schema").BriefingStatus;
    }>;
    run(orgId: string | undefined): Promise<{
        emailed: number;
        briefingId: string;
        briefingDate: string;
        timezone: string;
        generatedAt: string;
        stats: import("./schemas/daily-briefing.schema").BriefingStats;
        items: import("./schemas/daily-briefing.schema").BriefingItem[];
        narrative: string;
        status: import("./schemas/daily-briefing.schema").BriefingStatus;
    }>;
    getSubscription(optIn: unknown): Promise<{
        enabled: boolean;
    }>;
    setSubscription(userId: string | undefined, body: EmailSubscriptionDto): Promise<{
        enabled: boolean;
    }>;
}
