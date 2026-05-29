import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardModule } from '../dashboard/dashboard.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ExecBriefingController } from './exec-briefing.controller';
import { ExecBriefingScheduler } from './exec-briefing.scheduler';
import { ExecBriefingService } from './exec-briefing.service';
import {
  ExecBriefing,
  ExecBriefingSchema,
} from './schemas/exec-briefing.schema';

/**
 * Weekly executive briefing module. Parallels `BriefingModule` (daily) but
 * keeps its own collection, schedule, narrative templates, and audience.
 *
 * Re-uses DashboardService as the single source of truth for the underlying
 * aggregations — exec briefings restate dashboard facts; they don't compute
 * their own.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExecBriefing.name, schema: ExecBriefingSchema },
    ]),
    DashboardModule,
    OrganizationsModule,
  ],
  controllers: [ExecBriefingController],
  providers: [ExecBriefingService, ExecBriefingScheduler],
  exports: [ExecBriefingService],
})
export class ExecBriefingModule {}
