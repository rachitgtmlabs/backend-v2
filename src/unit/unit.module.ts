import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

/**
 * UnitModule registers the Lease schema as a feature so `listByProperty` can
 * attach the latest processed lease's summary (tenant_name, lease_end, rent)
 * to each unit without a circular import on LeaseModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Unit.name, schema: UnitSchema },
      { name: Lease.name, schema: LeaseSchema },
    ]),
    PortfolioModule,
    PropertyModule,
  ],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService, MongooseModule],
})
export class UnitModule {}
