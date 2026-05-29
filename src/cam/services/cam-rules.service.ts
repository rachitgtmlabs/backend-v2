import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateCamRuleDto, UpdateCamRuleDto } from '../dto/cam-rule.dto';
import { CamRule, CamRuleDocumentModel } from '../schemas/cam-rule.schema';
import { newCamRuleId } from '../utils/ids';

/**
 * Portfolio-scoped CAM Rule Library service. Rules are reusable templates
 * with base/share/exclusions params; units attach a rule and snapshot its
 * params into `unit.cam_allocation` (snapshot-on-attach — see schema).
 */
@Injectable()
export class CamRulesService {
  constructor(
    @InjectModel(CamRule.name)
    private readonly model: Model<CamRuleDocumentModel>,
  ) {}

  async listForPortfolio(portfolioId: string) {
    const docs = await this.model
      .find({ portfolio_id: portfolioId })
      .sort({ rule_code: 1 })
      .lean();
    return docs.map(toPayload);
  }

  async getOne(portfolioId: string, ruleId: string) {
    const doc = await this.model
      .findOne({ portfolio_id: portfolioId, ruleId })
      .lean();
    if (!doc) {
      throw new NotFoundException(`Rule ${ruleId} not found in this portfolio`);
    }
    return toPayload(doc);
  }

  /**
   * Lookup by `rule_code` — used by the unit form's autocomplete and the
   * snapshot-fill flow. Case-insensitive (matches the unique index collation).
   */
  async findByCode(portfolioId: string, ruleCode: string) {
    const code = ruleCode.trim();
    if (!code) return null;
    const doc = await this.model
      .findOne({
        portfolio_id: portfolioId,
        rule_code: { $regex: `^${escapeRegex(code)}$`, $options: 'i' },
      })
      .lean();
    return doc ? toPayload(doc) : null;
  }

  async create(dto: CreateCamRuleDto) {
    const portfolioId = dto.portfolio_id.trim();
    const ruleCode = dto.rule_code.trim();
    const ruleName = dto.rule_name.trim();
    if (!portfolioId || !ruleCode || !ruleName) {
      throw new BadRequestException(
        'portfolio_id, rule_code, and rule_name are required',
      );
    }
    try {
      const doc = await this.model.create({
        ruleId: newCamRuleId(),
        portfolio_id: portfolioId,
        rule_code: ruleCode,
        rule_name: ruleName,
        description: dto.description?.trim() || '',
        base_amount: dto.base_amount,
        base_year: dto.base_year,
        share_pct: dto.share_pct,
        admin_fee_pct:
          dto.admin_fee_pct === undefined ? null : dto.admin_fee_pct,
        exclusions: dto.exclusions ?? [],
        created_by: null,
      });
      return toPayload(doc.toObject());
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(
          `Rule code "${ruleCode}" already exists in this portfolio`,
        );
      }
      throw err;
    }
  }

  async update(portfolioId: string, ruleId: string, dto: UpdateCamRuleDto) {
    const doc = await this.model.findOne({
      ruleId,
      portfolio_id: portfolioId,
    });
    if (!doc) {
      throw new NotFoundException(`Rule ${ruleId} not found in this portfolio`);
    }
    if (dto.rule_code !== undefined) doc.rule_code = dto.rule_code.trim();
    if (dto.rule_name !== undefined) doc.rule_name = dto.rule_name.trim();
    if (dto.description !== undefined)
      doc.description = dto.description.trim();
    if (dto.base_amount !== undefined) doc.base_amount = dto.base_amount;
    if (dto.base_year !== undefined) doc.base_year = dto.base_year;
    if (dto.share_pct !== undefined) doc.share_pct = dto.share_pct;
    if (dto.admin_fee_pct !== undefined) doc.admin_fee_pct = dto.admin_fee_pct;
    if (dto.exclusions !== undefined) doc.exclusions = dto.exclusions;
    try {
      await doc.save();
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(
          `Rule code conflicts with another rule in this portfolio`,
        );
      }
      throw err;
    }
    return toPayload(doc.toObject());
  }

  async remove(portfolioId: string, ruleId: string) {
    const res = await this.model.deleteOne({
      ruleId,
      portfolio_id: portfolioId,
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException(`Rule ${ruleId} not found in this portfolio`);
    }
    return { ok: true };
  }
}

function toPayload(doc: Record<string, any>) {
  return {
    ruleId: doc.ruleId,
    portfolio_id: doc.portfolio_id,
    rule_code: doc.rule_code,
    rule_name: doc.rule_name,
    description: doc.description,
    base_amount: doc.base_amount,
    base_year: doc.base_year,
    share_pct: doc.share_pct,
    admin_fee_pct: doc.admin_fee_pct,
    exclusions: doc.exclusions,
    created_by: doc.created_by,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
