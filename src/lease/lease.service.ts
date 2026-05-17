import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { TasksAlertsService } from '../tasks-alerts/tasks-alerts.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { Lease, LeaseDocumentModel } from './schemas/lease.schema';
import { Amendment, AmendmentDocumentModel } from './schemas/amendment.schema';
import { deepMerge } from './utils/deep-merge.util';

function newLeaseId(): string {
  return `les_${randomBytes(6).toString('hex')}`;
}

function newAmendmentId(): string {
  return `amd_${randomBytes(6).toString('hex')}`;
}

@Injectable()
export class LeaseService {
  private readonly logger = new Logger(LeaseService.name);

  constructor(
    @InjectModel(Lease.name)
    private leaseModel: Model<LeaseDocumentModel>,
    @InjectModel(Amendment.name)
    private amendmentModel: Model<AmendmentDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
    private readonly tasksAlertsService: TasksAlertsService,
  ) {}

  async create(dto: CreateLeaseDto) {
    // Validate portfolio exists
    const exists = await this.portfolioService.existsByPortfolioId(
      dto.portfolio_id,
    );
    if (!exists) {
      throw new NotFoundException(
        `Portfolio not found: ${dto.portfolio_id}`,
      );
    }

    // Validate property belongs to portfolio
    const propertyOk = await this.propertyService.belongsToPortfolio(
      dto.property_id,
      dto.portfolio_id,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property not found in portfolio: ${dto.property_id}`,
      );
    }

    // Route based on document type
    if (dto.document_type === 'amendment') {
      return this.createAmendment(dto);
    } else {
      return this.createLease(dto);
    }
  }

  /**
   * Create an amendment for an existing lease
   */
  private async createAmendment(dto: CreateLeaseDto) {
    // Find the most recent lease for this property (regardless of status)
    const parentLease = await this.leaseModel
      .findOne({
        property_id: dto.property_id,
      })
      .sort({ updatedAt: -1 })
      .exec();

    if (!parentLease) {
      throw new BadRequestException(
        'Cannot create amendment: No lease exists for this property',
      );
    }

    // Calculate the new version number
    const newVersion = parentLease.amendment_version + 1;

    // Create the amendment document
    const amendmentId = newAmendmentId();
    const amendmentDoc = await this.amendmentModel.create({
      amendmentId,
      lease_id: parentLease.leaseId,
      version: newVersion,
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      status: dto.status,
      file_name: dto.file_name,
      lease_information: dto.lease_information,
      analysis: dto.analysis,
      gcs_document_path: dto.gcs_document_path ?? null,
      drafted_amendments: dto.drafted_amendments ?? [],
    });

    // Increment amendment_version on the parent lease
    await this.leaseModel.updateOne(
      { leaseId: parentLease.leaseId },
      { $inc: { amendment_version: 1 } },
    );

    const createdAt = amendmentDoc.createdAt;
    const updatedAt = amendmentDoc.updatedAt;

    return {
      amendment: {
        id: amendmentDoc.amendmentId,
        lease_id: amendmentDoc.lease_id,
        version: amendmentDoc.version,
        portfolio_id: amendmentDoc.portfolio_id,
        property_id: amendmentDoc.property_id,
        status: amendmentDoc.status,
        file_name: amendmentDoc.file_name,
        audit: {
          created_at: createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
        },
        links: {
          self: `/v1/amendments/${amendmentDoc.amendmentId}`,
          parent_lease: `/v1/leases/${parentLease.leaseId}`,
        },
      },
    };
  }

  /**
   * Create a new main lease
   */
  private async createLease(dto: CreateLeaseDto) {
    // Check if any lease exists for this property/portfolio
    const existingLease = await this.leaseModel
      .findOne({
        portfolio_id: dto.portfolio_id,
        property_id: dto.property_id,
      })
      .sort({ updatedAt: -1 })
      .exec();

    // If a lease exists, set it and all its amendments to draft
    if (existingLease) {
      // Set existing lease to draft
      await this.leaseModel.updateOne(
        { leaseId: existingLease.leaseId },
        { status: 'draft' },
      );

      // Set all amendments for that lease to draft
      await this.amendmentModel.updateMany(
        { lease_id: existingLease.leaseId },
        { status: 'draft' },
      );
    }

    // Create the new lease with amendment_version = 0
    const leaseId = newLeaseId();
    const doc = await this.leaseModel.create({
      leaseId,
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      status: dto.status,
      file_name: dto.file_name,
      lease_information: dto.lease_information,
      analysis: dto.analysis,
      amendment_version: 0,
      gcs_document_path: dto.gcs_document_path ?? null,
      drafted_amendments: dto.drafted_amendments ?? [],
    });

    try {
      await this.tasksAlertsService.seedForNewLease(
        dto.portfolio_id,
        dto.property_id,
        leaseId,
      );
    } catch (err) {
      this.logger.warn(
        `Tasks/alerts seed failed for lease ${leaseId}: ${String(err)}`,
      );
    }

    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      lease: {
        id: doc.leaseId,
        portfolio_id: doc.portfolio_id,
        property_id: doc.property_id,
        status: doc.status,
        file_name: doc.file_name,
        amendment_version: doc.amendment_version,
        audit: {
          created_at: createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
        },
        links: {
          self: `/v1/leases/${doc.leaseId}`,
        },
      },
    };
  }

  /**
   * Most recently updated saved lease for a portfolio + property (includes
   * lease_information + analysis payloads for the vault drawer).
   */
  async getLatestForPortfolioProperty(
    portfolioId: string,
    propertyId: string,
  ) {
    const propertyOk = await this.propertyService.belongsToPortfolio(
      propertyId,
      portfolioId,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property ${propertyId} not found in portfolio ${portfolioId}`,
      );
    }

    const doc = await this.leaseModel
      .findOne({
        portfolio_id: portfolioId,
        property_id: propertyId,
      })
      .sort({ updatedAt: -1 })
      .exec();

    if (!doc) {
      throw new NotFoundException(
        'No saved lease analysis for this property.',
      );
    }

    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      lease: {
        id: doc.leaseId,
        portfolio_id: doc.portfolio_id,
        property_id: doc.property_id,
        status: doc.status,
        file_name: doc.file_name,
        lease_information: doc.lease_information,
        analysis: doc.analysis,
        audit: {
          created_at: createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
        },
        links: {
          self: `/v1/leases/${doc.leaseId}`,
        },
      },
    };
  }

  /**
   * All saved main leases + amendments for a portfolio property, grouped by
   * vault status (processed → active list, draft → draft list).
   */
  async listDocumentsForPortfolioProperty(
    portfolioId: string,
    propertyId: string,
  ) {
    const propertyOk = await this.propertyService.belongsToPortfolio(
      propertyId,
      portfolioId,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property ${propertyId} not found in portfolio ${portfolioId}`,
      );
    }

    const [leaseRows, amendmentRows] = await Promise.all([
      this.leaseModel
        .find({ portfolio_id: portfolioId, property_id: propertyId })
        .sort({ updatedAt: -1 })
        .select(['leaseId', 'file_name', 'status', 'updatedAt'])
        .lean()
        .exec(),
      this.amendmentModel
        .find({ portfolio_id: portfolioId, property_id: propertyId })
        .sort({ updatedAt: -1 })
        .select(['amendmentId', 'file_name', 'status', 'updatedAt'])
        .lean()
        .exec(),
    ]);

    type Item = {
      id: string;
      kind: 'lease' | 'amendment';
      file_name: string;
      status: string;
      updated_at: string;
    };

    const leaseItems: Item[] = leaseRows.map((row) => ({
      id: row.leaseId,
      kind: 'lease' as const,
      file_name: row.file_name,
      status: row.status,
      updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));

    const amendmentItems: Item[] = amendmentRows.map((row) => ({
      id: row.amendmentId,
      kind: 'amendment' as const,
      file_name: row.file_name,
      status: row.status,
      updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));

    const all = [...leaseItems, ...amendmentItems];
    const byUpdatedDesc = (a: Item, b: Item) =>
      b.updated_at.localeCompare(a.updated_at);

    const active = all
      .filter((i) => i.status === 'processed')
      .sort(byUpdatedDesc);
    const draft = all.filter((i) => i.status === 'draft').sort(byUpdatedDesc);

    return { active, draft };
  }

  /**
   * Get the effective state of a lease by merging original lease + all amendments.
   * This computes the current values by applying all deltas in version order.
   */
  async getEffectiveState(leaseId: string) {
    // Get the original lease
    const lease = await this.leaseModel
      .findOne({ leaseId })
      .exec();

    if (!lease) {
      throw new NotFoundException(`Lease not found: ${leaseId}`);
    }

    // Get all amendments ordered by version
    const amendments = await this.amendmentModel
      .find({ lease_id: leaseId })
      .sort({ version: 1 })
      .exec();

    // Start with the original lease's values
    let effectiveLeaseInfo = { ...(lease.lease_information || {}) } as Record<string, unknown>;
    let effectiveAnalysis = { ...(lease.analysis || {}) } as Record<string, unknown>;

    // Apply each amendment's delta in order
    for (const amendment of amendments) {
      if (amendment.lease_information) {
        effectiveLeaseInfo = deepMerge(
          effectiveLeaseInfo,
          amendment.lease_information as Record<string, unknown>,
        );
      }
      if (amendment.analysis) {
        effectiveAnalysis = deepMerge(
          effectiveAnalysis,
          amendment.analysis as Record<string, unknown>,
        );
      }
    }

    // Build amendment history
    const amendmentHistory = amendments.map((a) => ({
      version: a.version,
      amendmentId: a.amendmentId,
      file_name: a.file_name,
      status: a.status,
      changedSections: Object.keys(a.analysis || {}),
      updated_at: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));

    const createdAt = lease.createdAt;
    const updatedAt = lease.updatedAt;

    return {
      leaseId: lease.leaseId,
      currentVersion: amendments.length,
      effectiveLeaseInfo,
      effectiveAnalysis,
      lease: {
        id: lease.leaseId,
        portfolio_id: lease.portfolio_id,
        property_id: lease.property_id,
        status: lease.status,
        file_name: lease.file_name,
        amendment_version: lease.amendment_version,
        created_at: createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
      },
      amendments: amendmentHistory,
    };
  }

  /**
   * Get effective state by property ID (finds the latest lease first)
   */
  async getEffectiveStateByProperty(portfolioId: string, propertyId: string) {
    const propertyOk = await this.propertyService.belongsToPortfolio(
      propertyId,
      portfolioId,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property ${propertyId} not found in portfolio ${portfolioId}`,
      );
    }

    // Find the latest processed lease for this property
    const lease = await this.leaseModel
      .findOne({
        portfolio_id: portfolioId,
        property_id: propertyId,
        status: 'processed',
      })
      .sort({ updatedAt: -1 })
      .exec();

    if (!lease) {
      throw new NotFoundException(
        'No processed lease found for this property.',
      );
    }

    return this.getEffectiveState(lease.leaseId);
  }

  /**
   * Get a specific amendment by ID
   */
  async getAmendment(amendmentId: string) {
    const amendment = await this.amendmentModel
      .findOne({ amendmentId })
      .exec();

    if (!amendment) {
      throw new NotFoundException(`Amendment not found: ${amendmentId}`);
    }

    return {
      amendment: {
        id: amendment.amendmentId,
        lease_id: amendment.lease_id,
        version: amendment.version,
        portfolio_id: amendment.portfolio_id,
        property_id: amendment.property_id,
        status: amendment.status,
        file_name: amendment.file_name,
        lease_information: amendment.lease_information,
        analysis: amendment.analysis,
        audit: {
          created_at: amendment.createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: amendment.updatedAt?.toISOString() ?? new Date().toISOString(),
        },
      },
    };
  }

  /**
   * List all amendments for a lease
   */
  async listAmendments(leaseId: string) {
    const lease = await this.leaseModel
      .findOne({ leaseId })
      .exec();

    if (!lease) {
      throw new NotFoundException(`Lease not found: ${leaseId}`);
    }

    const amendments = await this.amendmentModel
      .find({ lease_id: leaseId })
      .sort({ version: 1 })
      .exec();

    return {
      lease_id: leaseId,
      amendments: amendments.map((a) => ({
        id: a.amendmentId,
        version: a.version,
        status: a.status,
        file_name: a.file_name,
        changedSections: Object.keys(a.analysis || {}),
        audit: {
          created_at: a.createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: a.updatedAt?.toISOString() ?? new Date().toISOString(),
        },
      })),
    };
  }
}
