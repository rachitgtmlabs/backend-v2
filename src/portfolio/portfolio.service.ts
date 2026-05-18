import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Amendment, AmendmentDocumentModel } from '../lease/schemas/amendment.schema';
import { Lease, LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { Property, PropertyDocumentModel } from '../property/schemas/property.schema';
import {
  PropertyAlert,
  PropertyAlertDocumentModel,
} from '../tasks-alerts/schemas/property-alert.schema';
import {
  TaskAlert,
  TaskAlertDocumentModel,
} from '../tasks-alerts/schemas/task-alert.schema';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import {
  DocumentRequirement,
  Portfolio,
  PortfolioDocumentModel,
} from './schemas/portfolio.schema';

function newPortfolioId(): string {
  return `prt_${randomBytes(6).toString('hex')}`;
}

function newDocRequirementId(): string {
  return `doc_req_${randomBytes(4).toString('hex')}`;
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name)
    private portfolioModel: Model<PortfolioDocumentModel>,
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
  ) {}

  async create(dto: CreatePortfolioDto) {
    const p = dto.portfolio;
    const portfolioId = newPortfolioId();
    const document_requirements: DocumentRequirement[] =
      p.document_requirements.map((d) => ({
        docRequirementId: d.id?.trim() || newDocRequirementId(),
        document_type: d.document_type,
        requirement_level: d.requirement_level,
      }));

    const doc = await this.portfolioModel.create({
      portfolioId,
      name: p.name,
      description: p.description ?? '',
      classification: p.classification,
      locale: p.locale,
      stakeholders: p.stakeholders,
      document_requirements,
      tags: p.tags ?? [],
      attributes: {
        custom_fields: p.attributes?.custom_fields ?? {},
        source: p.attributes?.source ?? 'ui',
      },
      status: 'active',
      created_by: 'user_admin',
    });

    return this.toResponse(doc);
  }

  async findAll() {
    const docs = await this.portfolioModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    const ids = docs.map((d) => d.portfolioId);
    const countByPortfolio = await this.countPropertiesByPortfolioIds(ids);
    return {
      portfolios: docs.map((doc) => {
        const n = countByPortfolio.get(doc.portfolioId) ?? 0;
        return this.toResponse(doc, n).portfolio;
      }),
    };
  }

  /** Batch property counts for list views (one aggregation for all portfolios). */
  private async countPropertiesByPortfolioIds(
    portfolioIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (portfolioIds.length === 0) return map;
    const rows = await this.propertyModel
      .aggregate<{ _id: string; count: number }>([
        {
          $addFields: {
            _portfolioLink: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $ifNull: ['$portfolio_id', null] }, null] },
                    { $eq: ['$portfolio_id', ''] },
                  ],
                },
                '$portfolioId',
                '$portfolio_id',
              ],
            },
          },
        },
        { $match: { _portfolioLink: { $in: portfolioIds } } },
        { $group: { _id: '$_portfolioLink', count: { $sum: 1 } } },
      ])
      .exec();
    for (const row of rows) {
      map.set(row._id, row.count);
    }
    return map;
  }

  async existsByPortfolioId(portfolioId: string): Promise<boolean> {
    const n = await this.portfolioModel
      .countDocuments({ portfolioId })
      .exec();
    return n > 0;
  }

  async findOne(portfolioIdRaw: string) {
    const portfolioId = portfolioIdRaw.trim();
    const doc = await this.portfolioModel.findOne({ portfolioId }).exec();
    if (!doc) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
    const countMap = await this.countPropertiesByPortfolioIds([portfolioId]);
    return {
      portfolio: this.toResponse(
        doc,
        countMap.get(portfolioId) ?? 0,
      ).portfolio,
    };
  }

  async update(portfolioIdRaw: string, dto: CreatePortfolioDto) {
    const portfolioId = portfolioIdRaw.trim();
    const doc = await this.portfolioModel.findOne({ portfolioId }).exec();
    if (!doc) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    const p = dto.portfolio;
    const document_requirements: DocumentRequirement[] =
      p.document_requirements.map((d) => ({
        docRequirementId: d.id?.trim() || newDocRequirementId(),
        document_type: d.document_type,
        requirement_level: d.requirement_level,
      }));

    doc.name = p.name;
    doc.description = p.description ?? '';
    doc.classification = p.classification;
    doc.locale = p.locale;
    doc.stakeholders = p.stakeholders;
    doc.document_requirements = document_requirements;
    doc.tags = p.tags ?? [];
    doc.attributes = {
      custom_fields: p.attributes?.custom_fields ?? {},
      source:
        p.attributes?.source ?? doc.attributes?.source ?? 'ui',
    };

    await doc.save();

    const countMap = await this.countPropertiesByPortfolioIds([portfolioId]);
    return {
      portfolio: this.toResponse(
        doc,
        countMap.get(portfolioId) ?? 0,
      ).portfolio,
    };
  }

  /**
   * Items deleted when removing a portfolio (leases + amendments).
   * Other collections (tasks, property alerts, properties) are removed without listing every row.
   */
  async getDeletionImpact(portfolioIdRaw: string) {
    const portfolioId = portfolioIdRaw.trim();
    if (!(await this.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    const leaseRows = await this.leaseModel
      .find({ portfolio_id: portfolioId })
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
      .find({ portfolio_id: portfolioId })
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

  async remove(portfolioIdRaw: string) {
    const portfolioId = portfolioIdRaw.trim();
    if (!(await this.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    await this.taskAlertModel.deleteMany({ portfolio_id: portfolioId }).exec();
    await this.propertyAlertModel
      .deleteMany({ portfolio_id: portfolioId })
      .exec();
    await this.amendmentModel.deleteMany({ portfolio_id: portfolioId }).exec();
    await this.leaseModel.deleteMany({ portfolio_id: portfolioId }).exec();
    await this.propertyModel
      .deleteMany({
        $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
      })
      .exec();

    const del = await this.portfolioModel
      .deleteOne({ portfolioId })
      .exec();
    if (del.deletedCount === 0) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
  }

  private toResponse(doc: PortfolioDocumentModel, propertyCount = 0) {
    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;
    return {
      portfolio: {
        id: doc.portfolioId,
        name: doc.name,
        description: doc.description,
        classification: doc.classification,
        locale: doc.locale,
        stakeholders: doc.stakeholders,
        document_requirements: doc.document_requirements.map((d) => ({
          id: d.docRequirementId,
          document_type: d.document_type,
          requirement_level: d.requirement_level,
        })),
        tags: doc.tags,
        attributes: doc.attributes,
        status: doc.status,
        property_count: propertyCount,
        audit: {
          created_by: doc.created_by,
          created_at: createdAt?.toISOString() ?? new Date().toISOString(),
          updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
        },
        links: {
          self: `/v1/portfolios/${doc.portfolioId}`,
        },
      },
    };
  }
}
