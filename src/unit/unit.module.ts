import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Unit.name, schema: UnitSchema }]),
    PortfolioModule,
    PropertyModule,
  ],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService, MongooseModule],
})
export class UnitModule {}
