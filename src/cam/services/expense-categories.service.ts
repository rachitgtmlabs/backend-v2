import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import {
  ExpenseCategory,
  ExpenseCategoryDocumentModel,
} from '../schemas/expense-category.schema';
import { newCategoryId } from '../utils/ids';

/**
 * Stories 4 & 5 — expense category service.
 *
 *   listForPortfolio   — returns system + this portfolio's custom categories,
 *                        in display order (system first, then custom by name).
 *   createCustom       — Story 5; only custom categories (is_system=false).
 *                        System categories are seeded by the Phase 1 migration.
 *   updateCustom       — only custom, name+description+recoverable+notes.
 *   deleteCustom       — soft check (404 if not found / system).
 */
@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name)
    private readonly model: Model<ExpenseCategoryDocumentModel>,
  ) {}

  async listForPortfolio(portfolioId: string) {
    const docs = await this.model
      .find({
        $or: [{ portfolio_id: null }, { portfolio_id: portfolioId }],
      })
      .sort({ is_system: -1, name: 1 })
      .lean();
    return docs.map(toPayload);
  }

  async createCustom(dto: CreateCategoryDto) {
    const portfolioId = dto.portfolio_id.trim();
    const name = dto.name.trim();
    if (!portfolioId || !name) {
      throw new BadRequestException('portfolio_id and name are required');
    }
    try {
      const doc = await this.model.create({
        categoryId: newCategoryId(),
        portfolio_id: portfolioId,
        name,
        description: dto.description?.trim() || '',
        recoverable: dto.recoverable ?? true,
        is_system: false,
        notes: dto.notes?.trim() || null,
        created_by: null,
      });
      return toPayload(doc.toObject());
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(
          `Category "${name}" already exists in this portfolio`,
        );
      }
      throw err;
    }
  }

  async updateCustom(
    portfolioId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const doc = await this.model.findOne({
      categoryId,
      portfolio_id: portfolioId,
      is_system: false,
    });
    if (!doc) {
      throw new NotFoundException(
        `Custom category ${categoryId} not found in this portfolio`,
      );
    }
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.recoverable !== undefined) doc.recoverable = dto.recoverable;
    if (dto.notes !== undefined) doc.notes = dto.notes.trim() || null;
    try {
      await doc.save();
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException(`Name conflicts with existing category`);
      }
      throw err;
    }
    return toPayload(doc.toObject());
  }

  async deleteCustom(portfolioId: string, categoryId: string) {
    const res = await this.model.deleteOne({
      categoryId,
      portfolio_id: portfolioId,
      is_system: false,
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException(
        `Custom category ${categoryId} not found in this portfolio`,
      );
    }
    return { ok: true };
  }

  /**
   * Helper used by the engine layer to resolve a category's recoverable
   * flag and confirm existence before generating an invoice.
   */
  async findByName(
    portfolioId: string,
    name: string,
  ): Promise<ExpenseCategoryDocumentModel | null> {
    const trimmed = name.trim();
    return this.model
      .findOne({
        $or: [{ portfolio_id: null }, { portfolio_id: portfolioId }],
        name: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
      })
      .exec();
  }
}

function toPayload(doc: Record<string, any>) {
  return {
    categoryId: doc.categoryId,
    portfolio_id: doc.portfolio_id,
    name: doc.name,
    description: doc.description,
    recoverable: doc.recoverable,
    is_system: doc.is_system,
    notes: doc.notes,
    created_by: doc.created_by,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
