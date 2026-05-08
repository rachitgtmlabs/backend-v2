import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { Lease, LeaseDocumentModel } from './schemas/lease.schema';
import { Amendment, AmendmentDocumentModel } from './schemas/amendment.schema';

function newLeaseId(): string {
  return `les_${randomBytes(6).toString('hex')}`;
}

function newAmendmentId(): string {
  return `amd_${randomBytes(6).toString('hex')}`;
}

@Injectable()
export class LeaseService {
  constructor(
    @InjectModel(Lease.name)
    private leaseModel: Model<LeaseDocumentModel>,
    @InjectModel(Amendment.name)
    private amendmentModel: Model<AmendmentDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
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
    });

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
}
