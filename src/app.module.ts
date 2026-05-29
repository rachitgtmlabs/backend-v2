import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MongoIndexesService } from './database/mongo-indexes.service';
import { AmendmentAnalysisModule } from './amendment-analysis/amendment-analysis.module';
import { CamModule } from './cam/cam.module';
import { LeaseAnalysisModule } from './lease-analysis/lease-analysis.module';
import { LeaseModule } from './lease/lease.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PropertyModule } from './property/property.module';
import { TasksAlertsModule } from './tasks-alerts/tasks-alerts.module';
import { UnitModule } from './unit/unit.module';
import { ChatModule } from './chat/chat.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { BriefingModule } from './briefing/briefing.module';
import { ExecBriefingModule } from './exec-briefing/exec-briefing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/lease_iq',
      }),
    }),
    PortfolioModule,
    PropertyModule,
    UnitModule,
    LeaseModule,
    LeaseAnalysisModule,
    AmendmentAnalysisModule,
    CamModule,
    TasksAlertsModule,
    ChatModule,
    GoogleCalendarModule,
    DashboardModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    BriefingModule,
    ExecBriefingModule,
  ],
  providers: [MongoIndexesService],
})
export class AppModule {}
