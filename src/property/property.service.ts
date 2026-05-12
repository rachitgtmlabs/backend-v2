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
import { CreatePropertyFormDto } from './dto/create-property-form.dto';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { Property, PropertyDocumentModel } from './schemas/property.schema';
import type { Express } from 'express';

function newPropertyId(): string {
  return `prp_${randomBytes(6).toString('hex')}`;
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
    });

    return this.toResponse(doc);
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

    return {
      properties: docs.map((doc) => this.toPropertyPayload(doc)),
    };
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

  private toResponse(doc: PropertyDocumentModel) {
    return {
      property: this.toPropertyPayload(doc),
    };
  }

  private toPropertyPayload(doc: PropertyDocumentModel) {
    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      id: doc.propertyId,
      portfolio_id: doc.portfolio_id,
      property_name: doc.property_name,
      address: doc.address,
      property_type: doc.property_type,
      thumbnail_url: doc.thumbnail_url,
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
