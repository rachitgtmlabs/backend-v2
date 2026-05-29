import { Model } from 'mongoose';
import { DashboardService } from '../dashboard/dashboard.service';
import { Lease } from '../lease/schemas/lease.schema';
import { MailService } from '../mail/mail.service';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { TaskAlert } from '../tasks-alerts/schemas/task-alert.schema';
import { UsersService } from '../users/users.service';
import { DailyBriefingDocument } from './schemas/daily-briefing.schema';
export declare function orgLocalParts(timezone: string, now: Date): {
    date: string;
    hour: number;
};
export declare class BriefingService {
    private readonly briefingModel;
    private readonly portfolioModel;
    private readonly leaseModel;
    private readonly taskAlertModel;
    private readonly dashboardService;
    private readonly usersService;
    private readonly mailService;
    private readonly logger;
    constructor(briefingModel: Model<DailyBriefingDocument>, portfolioModel: Model<Portfolio>, leaseModel: Model<Lease>, taskAlertModel: Model<TaskAlert>, dashboardService: DashboardService, usersService: UsersService, mailService: MailService);
    getLatest(orgId: string): Promise<DailyBriefingDocument | null>;
    getLatestOrThrow(orgId: string): Promise<DailyBriefingDocument>;
    sendBriefingEmails(briefing: DailyBriefingDocument): Promise<number>;
    generateForOrg(orgId: string, opts: {
        timezone: string;
        now: Date;
        force?: boolean;
    }): Promise<DailyBriefingDocument>;
    private gatherFacts;
    private orgPortfolioIds;
}
