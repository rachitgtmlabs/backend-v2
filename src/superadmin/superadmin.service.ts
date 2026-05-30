import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Amendment,
  AmendmentDocumentModel,
} from '../lease/schemas/amendment.schema';
import { Lease, LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { OrganizationsService } from '../organizations/organizations.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

/** One org's settings plus live usage, as returned to the superadmin UI. */
export interface OrgSettingsView {
  orgId: string;
  name: string;
  domain: string;
  kind: string;
  timezone: string;
  settings: {
    maxPortfolios: number;
    maxLeases: number;
    maxAmendments: number;
    camReconciliationEnabled: boolean;
  };
  usage: {
    portfolios: number;
    leases: number;
    amendments: number;
  };
}

@Injectable()
export class SuperadminService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly portfolioService: PortfolioService,
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocumentModel>,
    @InjectModel(Amendment.name)
    private readonly amendmentModel: Model<AmendmentDocumentModel>,
  ) {}

  /** Every org with its settings and current usage counts. */
  async listOrganizations(): Promise<OrgSettingsView[]> {
    const orgs = await this.organizationsService.listAll();
    return Promise.all(orgs.map((org) => this.toView(org.orgId)));
  }

  /** Apply a partial settings update, then return the refreshed view. */
  async updateSettings(
    orgId: string,
    dto: UpdateOrgSettingsDto,
  ): Promise<OrgSettingsView> {
    const updated = await this.organizationsService.updateSettings(orgId, dto);
    if (!updated) {
      throw new NotFoundException(`Organization not found: ${orgId}`);
    }
    return this.toView(orgId);
  }

  /** Build the settings + usage view for a single org. */
  private async toView(orgId: string): Promise<OrgSettingsView> {
    const org = await this.organizationsService.findByOrgId(orgId);
    if (!org) {
      throw new NotFoundException(`Organization not found: ${orgId}`);
    }
    const portfolioIds =
      await this.portfolioService.listPortfolioIdsForOrg(orgId);
    const [leases, amendments] = await Promise.all([
      this.leaseModel
        .countDocuments({ portfolio_id: { $in: portfolioIds } })
        .exec(),
      this.amendmentModel
        .countDocuments({ portfolio_id: { $in: portfolioIds } })
        .exec(),
    ]);
    return {
      orgId: org.orgId,
      name: org.name,
      domain: org.domain,
      kind: org.kind,
      timezone: org.timezone,
      settings: {
        maxPortfolios: org.maxPortfolios ?? -1,
        maxLeases: org.maxLeases ?? -1,
        maxAmendments: org.maxAmendments ?? -1,
        camReconciliationEnabled: org.camReconciliationEnabled ?? true,
      },
      usage: {
        portfolios: portfolioIds.length,
        leases,
        amendments,
      },
    };
  }
}
