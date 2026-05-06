import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PropertyModule } from '../property/property.module';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { Lease, LeaseSchema } from './schemas/lease.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lease.name, schema: LeaseSchema }]),
    PortfolioModule,
    PropertyModule,
  ],  controllers: [LeaseController],
  providers: [LeaseService],
})
export class LeaseModule {}
