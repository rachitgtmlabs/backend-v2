import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { MailModule } from '../mail/mail.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Portfolio, PortfolioSchema } from '../portfolio/schemas/portfolio.schema';
import { UsersModule } from '../users/users.module';
import {
  TaskAlert,
  TaskAlertSchema,
} from '../tasks-alerts/schemas/task-alert.schema';
import { BriefingController } from './briefing.controller';
import { BriefingScheduler } from './briefing.scheduler';
import { BriefingService } from './briefing.service';
import {
  DailyBriefing,
  DailyBriefingSchema,
} from './schemas/daily-briefing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyBriefing.name, schema: DailyBriefingSchema },
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: Lease.name, schema: LeaseSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
    ]),
    DashboardModule,
    OrganizationsModule,
    UsersModule,
    MailModule,
  ],
  controllers: [BriefingController],
  providers: [BriefingService, BriefingScheduler],
  exports: [BriefingService],
})
export class BriefingModule {}
