import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from '../property/schemas/property.schema';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import {
  TaskAlert,
  TaskAlertSchema,
} from '../tasks-alerts/schemas/task-alert.schema';
import {
  PropertyAlert,
  PropertyAlertSchema,
} from '../tasks-alerts/schemas/property-alert.schema';
import {
  Portfolio,
  PortfolioSchema,
} from '../portfolio/schemas/portfolio.schema';
import { Unit, UnitSchema } from '../unit/schemas/unit.schema';
import {
  TenantInvoice,
  TenantInvoiceSchema,
} from '../cam/schemas/tenant-invoice.schema';
import {
  ReconciliationRun,
  ReconciliationRunSchema,
} from '../cam/schemas/reconciliation-run.schema';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Lease.name, schema: LeaseSchema },
      { name: TaskAlert.name, schema: TaskAlertSchema },
      { name: PropertyAlert.name, schema: PropertyAlertSchema },
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: TenantInvoice.name, schema: TenantInvoiceSchema },
      { name: ReconciliationRun.name, schema: ReconciliationRunSchema },
    ]),
    PortfolioModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
