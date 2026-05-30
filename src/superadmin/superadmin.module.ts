import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Amendment, AmendmentSchema } from '../lease/schemas/amendment.schema';
import { Lease, LeaseSchema } from '../lease/schemas/lease.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';

/**
 * Superadmin module — per-org quota & feature-flag management. Reads usage by
 * counting leases/amendments across each org's portfolios (those docs carry
 * only portfolio_id, hence PortfolioService.listPortfolioIdsForOrg).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lease.name, schema: LeaseSchema },
      { name: Amendment.name, schema: AmendmentSchema },
    ]),
    OrganizationsModule,
    PortfolioModule,
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
