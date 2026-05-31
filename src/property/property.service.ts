import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Amendment, AmendmentDocumentModel } from '../lease/schemas/amendment.schema';
import { Lease, LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PortfolioService } from '../portfolio/portfolio.service';
import {
  PropertyAlert,
  PropertyAlertDocumentModel,
} from '../tasks-alerts/schemas/property-alert.schema';
import {
  TaskAlert,
  TaskAlertDocumentModel,
} from '../tasks-alerts/schemas/task-alert.schema';
import { Unit, UnitDocumentModel } from '../unit/schemas/unit.schema';
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { Property, PropertyDocumentModel } from './schemas/property.schema';
import type { Express } from 'express';

function newPropertyId(): string {
  return `prp_${randomBytes(6).toString('hex')}`;
}


interface UnitStats {
  unit_count: number;
  occupied_count: number;
  default_unit_id: string | null;
  annual_rent: number;
}

function parseMoneyLeading(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw);
  const m = s.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

const PLACEHOLDER_THUMBNAIL_PATH =
  '/static/placeholders/real-estate-building-and-home-property-logo-design-concept-illustration-vector.jpg';

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocumentModel>,
    @InjectModel(Lease.name)
    private leaseModel: Model<LeaseDocumentModel>,
    @InjectModel(Amendment.name)
    private amendmentModel: Model<AmendmentDocumentModel>,
    @InjectModel(TaskAlert.name)
    private taskAlertModel: Model<TaskAlertDocumentModel>,
    @InjectModel(PropertyAlert.name)
    private propertyAlertModel: Model<PropertyAlertDocumentModel>,
    // Injected directly here (rather than via UnitService) because UnitModule
    // imports PropertyModule for `belongsToPortfolio`. PropertyService writes
    // a single default unit on property POST and reads counts for listings.
    @InjectModel(Unit.name)
    private unitModel: Model<UnitDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly gcsThumbnail: GcsThumbnailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePropertyFormDto, file?: Express.Multer.File) {
    const exists = await this.portfolioService.existsByPortfolioId(
      dto.portfolio_id,
    );
    if (!exists) {
      throw new NotFoundException(`Portfolio not found: ${dto.portfolio_id}`);
    }

    const propertyId = newPropertyId();
    let thumbnail_url: string | null = null;

    try {
      const objectPath = await this.gcsThumbnail.uploadPropertyThumbnail(
        propertyId,
        file,
      );
      if (objectPath) {
        thumbnail_url = this.buildAssetProxyUrl(objectPath);
      }
    } catch (err) {
      this.logger.warn(
        'GCS thumbnail upload failed; using default placeholder image',
        err instanceof Error ? err.message : err,
      );
      thumbnail_url = null;
    }

    if (!thumbnail_url) {
      thumbnail_url = this.defaultPropertyThumbnailUrl();
    }

    const doc = await this.propertyModel.create({
      propertyId,
      portfolio_id: dto.portfolio_id,
      property_name: dto.property_name,
      address: dto.address,
      property_type: dto.property_type,
      thumbnail_url,
      purchase_price: dto.purchase_price ?? null,
    });

    return this.toResponse(doc, {
      unit_count: 0,
      occupied_count: 0,
      default_unit_id: null,
      annual_rent: 0,
    });
  }

  async listByPortfolioId(portfolioId: string) {
    const exists = await this.portfolioService.existsByPortfolioId(
      portfolioId,
    );
    if (!exists) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    const docs = await this.propertyModel
      .find({
        $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
      })
      .sort({ createdAt: -1 })
      .exec();

    const propertyIds = docs.map((d) => d.propertyId);
    const unitStats = await this.aggregateUnitStats(portfolioId, propertyIds);

    return {
      properties: docs.map((doc) =>
        this.toPropertyPayload(doc, unitStats.get(doc.propertyId)),
      ),
    };
  }

  /**
   * One pass over `units` + `leases` to compute per-property unit_count /
   * occupied_count / default_unit_id for the properties list endpoint.
   * Inlined here so PropertyService doesn't reach into UnitService (which
   * would create a circular import).
   */
  private async aggregateUnitStats(
    portfolioId: string,
    propertyIds: string[],
  ): Promise<Map<string, UnitStats>> {
    const stats = new Map<string, UnitStats>();
    if (propertyIds.length === 0) return stats;

    for (const pid of propertyIds) {
      stats.set(pid, {
        unit_count: 0,
        occupied_count: 0,
        default_unit_id: null,
        annual_rent: 0,
      });
    }

    const units = await this.unitModel
      .find({
        portfolio_id: portfolioId,
        property_id: { $in: propertyIds },
      })
      .select({ unitId: 1, property_id: 1, status: 1, sqft_rentable: 1, _id: 0 })
      .lean()
      .exec();

    const unitSqft = new Map<string, number>();
    const firstUnitByProperty = new Map<string, string>();
    for (const u of units) {
      const bucket = stats.get(u.property_id);
      if (!bucket) continue;
      bucket.unit_count += 1;
      if (!firstUnitByProperty.has(u.property_id)) {
        firstUnitByProperty.set(u.property_id, u.unitId);
      }
      if (u.sqft_rentable) unitSqft.set(u.unitId, u.sqft_rentable);
    }

    // Occupied = active unit that has at least one processed lease. Also
    // grab lease_information so we can compute annual rent per property.
    const processedLeases = await this.leaseModel
      .find({
        portfolio_id: portfolioId,
        property_id: { $in: propertyIds },
        status: 'processed',
      })
      .select({ unit_id: 1, property_id: 1, lease_information: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const occupiedUnitsByProperty = new Map<string, Set<string>>();
    // Latest processed lease per unit (leases sorted newest-first)
    const latestLeaseByUnit = new Map<string, typeof processedLeases[number]>();
    for (const l of processedLeases) {
      if (!l.unit_id || !l.property_id) continue;
      let set = occupiedUnitsByProperty.get(l.property_id);
      if (!set) {
        set = new Set<string>();
        occupiedUnitsByProperty.set(l.property_id, set);
      }
      set.add(l.unit_id);
      if (!latestLeaseByUnit.has(l.unit_id)) latestLeaseByUnit.set(l.unit_id, l);
    }

    for (const [pid, bucket] of stats.entries()) {
      bucket.occupied_count = occupiedUnitsByProperty.get(pid)?.size ?? 0;
      if (bucket.unit_count === 1) {
        bucket.default_unit_id = firstUnitByProperty.get(pid) ?? null;
      }
    }

    // Sum annual rent per property from latest lease × sqft for each unit.
    // Falls back to the sqft recorded in the lease itself when the unit record
    // has no sqft_rentable (common for properties imported without area data).
    for (const [unitId, lease] of latestLeaseByUnit.entries()) {
      if (!lease.property_id) continue;
      const bucket = stats.get(lease.property_id);
      if (!bucket) continue;
      const info = (lease.lease_information as { leaseInformation?: Record<string, any> })?.leaseInformation ?? {};
      const rentPerSqft = parseMoneyLeading(info.rentPerSqFt?.value);
      const sqft = unitSqft.get(unitId) ?? parseMoneyLeading(info.squareFeet?.value);
      if (rentPerSqft != null && sqft != null && sqft > 0) {
        bucket.annual_rent += Math.round(rentPerSqft * sqft * 100) / 100;
      }
    }

    return stats;
  }

  /**
   * Leases & amendments linked to this property (for delete confirmation UI).
   */
  async getDeletionImpact(portfolioIdRaw: string, propertyIdRaw: string) {
    const portfolioId = portfolioIdRaw.trim();
    const propertyId = propertyIdRaw.trim();

    if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
    if (!(await this.belongsToPortfolio(propertyId, portfolioId))) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    const leaseRows = await this.leaseModel
      .find({ portfolio_id: portfolioId, property_id: propertyId })
      .select({
        leaseId: 1,
        file_name: 1,
        property_id: 1,
        status: 1,
        _id: 0,
      })
      .lean()
      .exec();

    const amendmentRows = await this.amendmentModel
      .find({ portfolio_id: portfolioId, property_id: propertyId })
      .select({
        amendmentId: 1,
        lease_id: 1,
        version: 1,
        file_name: 1,
        property_id: 1,
        status: 1,
        _id: 0,
      })
      .lean()
      .exec();

    return {
      leases: leaseRows.map((l) => ({
        id: l.leaseId,
        file_name: l.file_name,
        property_id: l.property_id,
        status: l.status,
      })),
      amendments: amendmentRows.map((a) => ({
        id: a.amendmentId,
        lease_id: a.lease_id,
        version: a.version,
        file_name: a.file_name,
        property_id: a.property_id,
        status: a.status,
      })),
    };
  }

  /** Cascade-delete one property and its leases, amendments, tasks, and alerts. */
  async remove(portfolioIdRaw: string, propertyIdRaw: string): Promise<void> {
    const portfolioId = portfolioIdRaw.trim();
    const propertyId = propertyIdRaw.trim();

    if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
    if (!(await this.belongsToPortfolio(propertyId, portfolioId))) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    await this.taskAlertModel
      .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
      .exec();
    await this.propertyAlertModel
      .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
      .exec();
    await this.amendmentModel
      .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
      .exec();
    await this.leaseModel
      .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
      .exec();
    await this.unitModel
      .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
      .exec();

    const del = await this.propertyModel
      .deleteOne({
        propertyId,
        $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
      })
      .exec();
    if (del.deletedCount === 0) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }
  }

  async update(
    portfolioIdRaw: string,
    propertyIdRaw: string,
    dto: import('./dto/update-property-form.dto').UpdatePropertyFormDto,
    file?: Express.Multer.File,
  ) {
    const portfolioId = portfolioIdRaw.trim();
    const propertyId = propertyIdRaw.trim();

    if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    const doc = await this.propertyModel.findOne({
      propertyId,
      $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
    }).exec();

    if (!doc) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    if (dto.property_name) doc.property_name = dto.property_name;
    if (dto.address) doc.address = dto.address;
    if (dto.property_type) doc.property_type = dto.property_type;
    if (dto.purchase_price != null) doc.purchase_price = dto.purchase_price;

    if (file) {
      try {
        const objectPath = await this.gcsThumbnail.uploadPropertyThumbnail(propertyId, file);
        if (objectPath) {
          doc.thumbnail_url = this.buildAssetProxyUrl(objectPath);
        }
      } catch (err) {
        this.logger.warn('GCS thumbnail upload failed during update', err instanceof Error ? err.message : err);
      }
    }

    await doc.save();
    return this.toResponse(doc);
  }

  /** True if a property id exists and belongs to the given portfolio. */
  async belongsToPortfolio(
    propertyId: string,
    portfolioId: string,
  ): Promise<boolean> {
    const doc = await this.propertyModel
      .findOne({
        propertyId,
        $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
      })
      .exec();
    return doc != null;
  }

  /** Public base URL for links served by this API (set API_PUBLIC_URL in production). */
  private defaultPropertyThumbnailUrl(): string {
    const raw = this.config.get<string>('API_PUBLIC_URL')?.trim();
    const fromEnv = raw ? raw.replace(/\/$/, '') : '';
    const port =
      this.config.get<string>('PORT')?.trim() ||
      process.env.PORT ||
      '3001';
    const base = fromEnv || `http://localhost:${port}`;
    return `${base}${PLACEHOLDER_THUMBNAIL_PATH}`;
  }

  /** Builds backend proxy URL for a GCS asset. */
  private buildAssetProxyUrl(objectPath: string): string {
    const raw = this.config.get<string>('API_PUBLIC_URL')?.trim();
    const fromEnv = raw ? raw.replace(/\/$/, '') : '';
    const port =
      this.config.get<string>('PORT')?.trim() ||
      process.env.PORT ||
      '3001';
    const base = fromEnv || `http://localhost:${port}`;
    return `${base}/v1/properties/asset/${objectPath}`;
  }

  private toResponse(doc: PropertyDocumentModel, stats?: UnitStats) {
    return {
      property: this.toPropertyPayload(doc, stats),
    };
  }

  private toPropertyPayload(doc: PropertyDocumentModel, stats?: UnitStats) {
    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    const annualRent = stats?.annual_rent ?? 0;
    const capRate = (() => {
      if (!doc.purchase_price || doc.purchase_price <= 0 || annualRent <= 0) return null;
      return `${((annualRent / doc.purchase_price) * 100).toFixed(1)}%`;
    })();
    return {
      id: doc.propertyId,
      portfolio_id: doc.portfolio_id,
      property_name: doc.property_name,
      address: doc.address,
      property_type: doc.property_type,
      thumbnail_url: doc.thumbnail_url,
      purchase_price: doc.purchase_price ?? null,
      // Unit-layer summary. Omitted on legacy paths (e.g. dashboard widgets)
      // by leaving `stats` undefined — the frontend already treats these
      // fields as optional.
      unit_count: stats?.unit_count,
      occupied_count: stats?.occupied_count,
      default_unit_id: stats?.default_unit_id ?? null,
      annual_rent: annualRent > 0 ? annualRent : undefined,
      cap_rate: capRate,
      audit: {
        created_at: createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
      },
      links: {
        self: `/v1/properties/${doc.propertyId}`,
      },
    };
  }
}
