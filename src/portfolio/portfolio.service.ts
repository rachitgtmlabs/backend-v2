import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
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
    return {
      portfolios: docs.map((doc) => this.toResponse(doc).portfolio),
    };
  }

  async existsByPortfolioId(portfolioId: string): Promise<boolean> {
    const n = await this.portfolioModel
      .countDocuments({ portfolioId })
      .exec();
    return n > 0;
  }

  private toResponse(doc: PortfolioDocumentModel) {
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
