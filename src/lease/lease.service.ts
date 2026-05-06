import {
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

function newLeaseId(): string {
  return `les_${randomBytes(6).toString('hex')}`;
}

@Injectable()
export class LeaseService {
  constructor(
    @InjectModel(Lease.name)
    private leaseModel: Model<LeaseDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
  ) {}

  async create(dto: CreateLeaseDto) {
    const exists = await this.portfolioService.existsByPortfolioId(
      dto.portfolio_id,
    );
    if (!exists) {
      throw new NotFoundException(
        `Portfolio not found: ${dto.portfolio_id}`,
      );
    }

    const propertyOk = await this.propertyService.belongsToPortfolio(
      dto.property_id,
      dto.portfolio_id,
    );
    if (!propertyOk) {
      throw new NotFoundException(
        `Property not found in portfolio: ${dto.property_id}`,
      );
    }

    const leaseId = newLeaseId();
    const doc = await this.leaseModel.create({
      leaseId,
      portfolio_id: dto.portfolio_id,
      property_id: dto.property_id,
      status: dto.status,
      file_name: dto.file_name,
      lease_information: dto.lease_information,
      analysis: dto.analysis,
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
