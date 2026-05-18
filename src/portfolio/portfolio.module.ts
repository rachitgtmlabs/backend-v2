import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { Amendment, AmendmentSchema } from '../lease/schemas/amendment.schema';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import {
  PropertyAlert,
  PropertyAlertSchema,
} from '../tasks-alerts/schemas/property-alert.schema';
import {
  TaskAlert,
  TaskAlertSchema,
} from '../tasks-alerts/schemas/task-alert.schema';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { Portfolio, PortfolioSchema } from './schemas/portfolio.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Lease.name, schema: LeaseSchema },
      { name: Amendment.name, schema: AmendmentSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
      { name: PropertyAlert.name, schema: PropertyAlertSchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
