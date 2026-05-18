import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { TaskAlert, TaskAlertSchema } from '../tasks-alerts/schemas/task-alert.schema';
import { Portfolio, PortfolioSchema } from '../portfolio/schemas/portfolio.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Lease.name, schema: LeaseSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
      { name: Portfolio.name, schema: PortfolioSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
