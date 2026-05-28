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
import { GcsThumbnailService } from '../property/gcs-thumbnail.service';
import { UnitService } from '../unit/unit.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { Lease, LeaseDocumentModel } from './schemas/lease.schema';
import { Amendment, AmendmentDocumentModel } from './schemas/amendment.schema';
import { deepMerge } from './utils/deep-merge.util';
import {
  buildFieldHistory,
  type FieldHistoryPayload,
} from './utils/field-history.util';

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
    private readonly gcsThumbnail: GcsThumbnailService,
    private readonly unitService: UnitService,
  ) {}

  async create(
    dto: CreateLeaseDto,
    auth?: { userEmail?: string | null },
  ) {
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

    // Route based on document type. Unit resolution differs between the two
    // paths: main leases need an explicit or auto-resolvable unit; amendments
    // inherit unit_id from the parent lease and ignore any caller-supplied
    // unit_id entirely.
    if (dto.document_type === 'amendment') {
      return this.createAmendment(dto, auth?.userEmail ?? null);
    }

    const unitId = await this.resolveUnitIdForNewLease(dto);
    return this.createLease(dto, unitId);
  }

  /**
   * For a NEW main lease:
   *   - If the caller passes `unit_id`, verify it belongs to (portfolio, property).
   *   - Otherwise auto-link when the property has exactly one active unit.
   *   - Else reject with 400 so the frontend can prompt the user to pick a unit.
   *
   * Amendments don't go through here — they inherit from the parent lease.
   */
  private async resolveUnitIdForNewLease(dto: CreateLeaseDto): Promise<string> {
    const explicit = dto.unit_id?.trim();
    if (explicit) {
      const owned = await this.unitService.findInPortfolioProperty(
        dto.portfolio_id,
        dto.property_id,
        explicit,
      );
      if (!owned) {
        throw new BadRequestException({
          message: `Unit ${explicit} does not belong to property ${dto.property_id}`,
          code: 'UNIT_NOT_ON_PROPERTY',
        });
      }
      return owned.unitId;
    }

    const sole = await this.unitService.resolveSoleActiveUnit(
      dto.portfolio_id,
      dto.property_id,
    );
    if (sole) return sole.unitId;

    // Either zero units (migration miss, or property created before the
    // dual-write phase ran) or multiple — both require an explicit choice.
    const { units } = await this.unitService.listByProperty(
      dto.portfolio_id,
      dto.property_id,
    );
    throw new BadRequestException({
      message:
        units.length === 0
          ? 'No unit exists on this property. Create a unit before saving a lease.'
          : 'Property has multiple units; unit_id is required.',
      code: units.length === 0 ? 'NO_UNITS_ON_PROPERTY' : 'UNIT_ID_REQUIRED',
      units,
    });
  }

  /**
   * Create an amendment for an existing lease
   */
  private async createAmendment(
    dto: CreateLeaseDto,
    userEmail: string | null,
  ) {
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

    // Manual edit detection: no source PDF + an authenticated user means this
    // amendment originated from the user editing extracted fields directly,
    // not from uploading an amendment document. Stamp `edited_by` from the
    // JWT identity so we can later distinguish human-touched deltas.
    const isManualEdit =
      !dto.gcs_document_path?.trim() && Boolean(userEmail);
    if (isManualEdit) {
      this.logger.log(
        `Creating manual amendment without source file (edited_by=${userEmail})`,
      );
    }

    // Create the amendment document. unit_id is inherited from the parent
    // lease — never trusted from the caller — so amendments always live
    // under the same unit as the lease they amend.
    const amendmentId = newAmendmentId();
    const amendmentDoc = await this.amendmentModel.create({
      amendmentId,
      lease_id: parentLease.leaseId,
      version: newVersion,
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      unit_id: parentLease.unit_id ?? null,
      status: dto.status,
      file_name: dto.file_name,
      lease_information: dto.lease_information,
      analysis: dto.analysis,
      gcs_document_path: dto.gcs_document_path ?? null,
      drafted_amendments: dto.drafted_amendments ?? [],
      edited_by: isManualEdit ? userEmail : null,
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
        unit_id: amendmentDoc.unit_id ?? null,
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
   * Create a new main lease. The caller has already resolved `unitId` (either
   * from the DTO or by auto-link); both Lease and any superseded leases for
   * the same unit are kept consistent.
   */
  private async createLease(dto: CreateLeaseDto, unitId: string) {
    // Supersede any prior processed/draft leases on the SAME unit. Previously
    // this was scoped by property; with units, two leases on different units
    // of the same property can both be active simultaneously, so the
    // supersede pass must be unit-scoped.
    const existingLease = await this.leaseModel
      .findOne({ unit_id: unitId })
      .sort({ updatedAt: -1 })
      .exec();

    if (existingLease) {
      await this.leaseModel.updateOne(
        { leaseId: existingLease.leaseId },
        { status: 'draft' },
      );
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
      unit_id: unitId,
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
        unitId,
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
        unit_id: doc.unit_id,
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

    // Fetch all amendments so the caller can render them in the review panel
    const amendmentDocs = await this.amendmentModel
      .find({ lease_id: doc.leaseId })
      .sort({ version: 1 })
      .exec();

    // Flag the multi-unit case so legacy consumers can decide to redirect the
    // user to a unit picker instead of silently showing one unit's lease.
    const multiUnit = await this.unitService
      .listByProperty(portfolioId, propertyId)
      .then((res) => res.units.filter((u) => u.status === 'active').length > 1)
      .catch(() => false);

    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      lease: {
        id: doc.leaseId,
        portfolio_id: doc.portfolio_id,
        property_id: doc.property_id,
        unit_id: doc.unit_id ?? null,
        status: doc.status,
        file_name: doc.file_name,
        gcs_document_path: doc.gcs_document_path ?? null,
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
      amendments: amendmentDocs.map((a) => ({
        id: a.amendmentId,
        version: a.version,
        file_name: a.file_name,
        gcs_document_path: a.gcs_document_path ?? null,
        drafted_amendments: a.drafted_amendments ?? [],
      })),
      multi_unit: multiUnit,
    };
  }

  /**
   * By-unit variant of `getLatestForPortfolioProperty` — returns the most
   * recently updated lease for a unit, plus all its amendments. Phase 2:
   * frontend continues to call the property variant; this method is wired
   * for the Phase 3 cutover.
   */
  async getLatestForPortfolioUnit(portfolioId: string, unitId: string) {
    const unit = await this.unitService.getOne(portfolioId, unitId);

    const doc = await this.leaseModel
      .findOne({ portfolio_id: portfolioId, unit_id: unit.unit.id })
      .sort({ updatedAt: -1 })
      .exec();

    if (!doc) {
      throw new NotFoundException('No saved lease analysis for this unit.');
    }

    const amendmentDocs = await this.amendmentModel
      .find({ lease_id: doc.leaseId })
      .sort({ version: 1 })
      .exec();

    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      lease: {
        id: doc.leaseId,
        portfolio_id: doc.portfolio_id,
        property_id: doc.property_id,
        unit_id: doc.unit_id ?? null,
        status: doc.status,
        file_name: doc.file_name,
        gcs_document_path: doc.gcs_document_path ?? null,
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
      amendments: amendmentDocs.map((a) => ({
        id: a.amendmentId,
        version: a.version,
        file_name: a.file_name,
        gcs_document_path: a.gcs_document_path ?? null,
        drafted_amendments: a.drafted_amendments ?? [],
      })),
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
   * By-unit variant of `listDocumentsForPortfolioProperty`. Same grouping,
   * scoped to one unit.
   */
  async listDocumentsForPortfolioUnit(portfolioId: string, unitId: string) {
    // Verifies the unit belongs to the portfolio.
    await this.unitService.getOne(portfolioId, unitId);

    const [leaseRows, amendmentRows] = await Promise.all([
      this.leaseModel
        .find({ portfolio_id: portfolioId, unit_id: unitId })
        .sort({ updatedAt: -1 })
        .select(['leaseId', 'file_name', 'status', 'updatedAt'])
        .lean()
        .exec(),
      this.amendmentModel
        .find({ portfolio_id: portfolioId, unit_id: unitId })
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
      gcs_document_path: a.gcs_document_path ?? null,
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
        unit_id: lease.unit_id ?? null,
        status: lease.status,
        file_name: lease.file_name,
        gcs_document_path: lease.gcs_document_path ?? null,
        amendment_version: lease.amendment_version,
        created_at: createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
      },
      amendments: amendmentHistory,
    };
  }

  /**
   * Get effective state by unit ID (finds the latest processed lease for the
   * unit, then merges its amendments).
   */
  async getEffectiveStateByUnit(portfolioId: string, unitId: string) {
    await this.unitService.getOne(portfolioId, unitId);
    const lease = await this.leaseModel
      .findOne({ portfolio_id: portfolioId, unit_id: unitId, status: 'processed' })
      .sort({ updatedAt: -1 })
      .exec();
    if (!lease) {
      throw new NotFoundException('No processed lease found for this unit.');
    }
    return this.getEffectiveState(lease.leaseId);
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
   * Download a stored document from GCS by its object path.
   * The path must start with `documents/` to prevent traversal.
   */
  async downloadDocument(objectPath: string) {
    if (!objectPath.startsWith('documents/')) {
      throw new BadRequestException('Invalid document path');
    }
    const result = await this.gcsThumbnail.downloadFile(objectPath);
    if (!result) {
      throw new NotFoundException('Document not found or storage not configured');
    }
    return result;
  }

  /**
   * Field-level history for the Timeline view — per tracked scalar field,
   * lists every version (original + amendments) where the value changed.
   * Arrays (rent schedule, milestones) are intentionally not tracked here.
   */
  async getFieldHistory(leaseId: string): Promise<FieldHistoryPayload> {
    const lease = await this.leaseModel.findOne({ leaseId }).exec();
    if (!lease) {
      throw new NotFoundException(`Lease not found: ${leaseId}`);
    }

    const amendments = await this.amendmentModel
      .find({ lease_id: leaseId })
      .sort({ version: 1 })
      .exec();

    const originalEffectiveDate =
      lease.createdAt?.toISOString() ?? new Date().toISOString();

    return buildFieldHistory({
      leaseId: lease.leaseId,
      originalAnalysis: (lease.analysis ?? {}) as Record<string, unknown>,
      originalEffectiveDate,
      amendments: amendments.map((a) => ({
        amendmentId: a.amendmentId,
        version: a.version,
        analysisDelta: (a.analysis ?? undefined) as
          | Record<string, unknown>
          | undefined,
        effectiveDate:
          a.createdAt?.toISOString() ?? new Date().toISOString(),
        editedBy: a.edited_by ?? null,
        draftedAddendums: (a.drafted_amendments ?? []).map((d) => ({
          key: d.key,
          riskTitle: d.riskTitle,
          riskSeverity: d.riskSeverity,
          resolutionLabel: d.resolutionLabel,
          markdown: d.markdown,
          generatedAt: d.generatedAt,
        })),
      })),
      originalDraftedAddendums: (lease.drafted_amendments ?? []).map((d) => ({
        key: d.key,
        riskTitle: d.riskTitle,
        riskSeverity: d.riskSeverity,
        resolutionLabel: d.resolutionLabel,
        markdown: d.markdown,
        generatedAt: d.generatedAt,
      })),
    });
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
