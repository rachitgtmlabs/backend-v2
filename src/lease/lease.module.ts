import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksAlertsModule } from '../tasks-alerts/tasks-alerts.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { LeaseController } from './lease.controller';
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
    TasksAlertsModule,
  ],
  controllers: [LeaseController],
  providers: [LeaseService],
})
export class LeaseModule {}
