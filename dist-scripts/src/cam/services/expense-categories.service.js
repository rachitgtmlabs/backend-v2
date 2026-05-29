"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const expense_category_schema_1 = require("../schemas/expense-category.schema");
const ids_1 = require("../utils/ids");
let ExpenseCategoriesService = class ExpenseCategoriesService {
    constructor(model) {
        this.model = model;
    }
    async listForPortfolio(portfolioId) {
        const docs = await this.model
            .find({
            $or: [{ portfolio_id: null }, { portfolio_id: portfolioId }],
        })
            .sort({ is_system: -1, name: 1 })
            .lean();
        return docs.map(toPayload);
    }
    async createCustom(dto) {
        const portfolioId = dto.portfolio_id.trim();
        const name = dto.name.trim();
        if (!portfolioId || !name) {
            throw new common_1.BadRequestException('portfolio_id and name are required');
        }
        try {
            const doc = await this.model.create({
                categoryId: (0, ids_1.newCategoryId)(),
                portfolio_id: portfolioId,
                name,
                description: dto.description?.trim() || '',
                recoverable: dto.recoverable ?? true,
                is_system: false,
                notes: dto.notes?.trim() || null,
                created_by: null,
            });
            return toPayload(doc.toObject());
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException(`Category "${name}" already exists in this portfolio`);
            }
            throw err;
        }
    }
    async updateCustom(portfolioId, categoryId, dto) {
        const doc = await this.model.findOne({
            categoryId,
            portfolio_id: portfolioId,
            is_system: false,
        });
        if (!doc) {
            throw new common_1.NotFoundException(`Custom category ${categoryId} not found in this portfolio`);
        }
        if (dto.name !== undefined)
            doc.name = dto.name.trim();
        if (dto.description !== undefined)
            doc.description = dto.description.trim();
        if (dto.recoverable !== undefined)
            doc.recoverable = dto.recoverable;
        if (dto.notes !== undefined)
            doc.notes = dto.notes.trim() || null;
        try {
            await doc.save();
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException(`Name conflicts with existing category`);
            }
            throw err;
        }
        return toPayload(doc.toObject());
    }
    async deleteCustom(portfolioId, categoryId) {
        const res = await this.model.deleteOne({
            categoryId,
            portfolio_id: portfolioId,
            is_system: false,
        });
        if (res.deletedCount === 0) {
            throw new common_1.NotFoundException(`Custom category ${categoryId} not found in this portfolio`);
        }
        return { ok: true };
    }
    async findByName(portfolioId, name) {
        const trimmed = name.trim();
        return this.model
            .findOne({
            $or: [{ portfolio_id: null }, { portfolio_id: portfolioId }],
            name: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
        })
            .exec();
    }
};
exports.ExpenseCategoriesService = ExpenseCategoriesService;
exports.ExpenseCategoriesService = ExpenseCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(expense_category_schema_1.ExpenseCategory.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ExpenseCategoriesService);
function toPayload(doc) {
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
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=expense-categories.service.js.map