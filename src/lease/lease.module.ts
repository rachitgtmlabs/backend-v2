import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksAlertsModule } from '../tasks-alerts/tasks-alerts.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { UnitModule } from '../unit/unit.module';
import { LeaseController, AmendmentController } from './lease.controller';
import { DocumentsController } from './documents.controller';
import { LeaseService } from './lease.service';
import { Lease, LeaseSchema } from './schemas/lease.schema';
import { Amendment, AmendmentSchema } from './schemas/amendment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lease.name, schema: LeaseSchema },
      { name: Amendment.name, schema: AmendmentSchema },
    ]),
    PortfolioModule,
    PropertyModule,
    UnitModule,
    TasksAlertsModule,
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [LeaseController, AmendmentController, DocumentsController],
  providers: [LeaseService],
  exports: [LeaseService],
})
export class LeaseModule {}
