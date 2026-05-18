import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import {
  PropertyAlert,
  PropertyAlertSchema,
} from './schemas/property-alert.schema';
import { TaskAlert, TaskAlertSchema } from './schemas/task-alert.schema';
import { TasksAlertsController } from './tasks-alerts.controller';
import { TasksAlertsService } from './tasks-alerts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyAlert.name, schema: PropertyAlertSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
      { name: Lease.name, schema: LeaseSchema },
    ]),
    PortfolioModule,
    PropertyModule,
  ],
  controllers: [TasksAlertsController],
  providers: [TasksAlertsService],
  exports: [TasksAlertsService],
})
export class TasksAlertsModule {}
