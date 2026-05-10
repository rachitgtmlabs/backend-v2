import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaseAnalysisModule } from './lease-analysis/lease-analysis.module';
import { LeaseModule } from './lease/lease.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PropertyModule } from './property/property.module';
import { TasksAlertsModule } from './tasks-alerts/tasks-alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/lease_iq',
      }),
    }),
    PortfolioModule,
    PropertyModule,
    LeaseModule,
    LeaseAnalysisModule,
    TasksAlertsModule,
  ],
})
export class AppModule {}
