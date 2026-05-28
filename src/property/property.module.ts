import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Amendment, AmendmentSchema } from '../lease/schemas/amendment.schema';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { PortfolioModule } from '../portfolio/portfolio.module';
import {
  PropertyAlert,
  PropertyAlertSchema,
} from '../tasks-alerts/schemas/property-alert.schema';
import { TaskAlert, TaskAlertSchema } from '../tasks-alerts/schemas/task-alert.schema';
import { Unit, UnitSchema } from '../unit/schemas/unit.schema';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { Property, PropertySchema } from './schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Lease.name, schema: LeaseSchema },
      { name: Amendment.name, schema: AmendmentSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
      { name: PropertyAlert.name, schema: PropertyAlertSchema },
      // Registered here (instead of importing UnitModule) so PropertyService
      // can query/insert units directly without a circular import. UnitModule
      // depends on PropertyModule for `belongsToPortfolio`.
      { name: Unit.name, schema: UnitSchema },
    ]),
    PortfolioModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService, GcsThumbnailService],
  exports: [PropertyService, GcsThumbnailService],
})
export class PropertyModule {}
