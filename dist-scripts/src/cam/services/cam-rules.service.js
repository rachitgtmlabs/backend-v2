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
exports.CamRulesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cam_rule_schema_1 = require("../schemas/cam-rule.schema");
const ids_1 = require("../utils/ids");
let CamRulesService = class CamRulesService {
    constructor(model) {
        this.model = model;
    }
    async listForPortfolio(portfolioId) {
        const docs = await this.model
            .find({ portfolio_id: portfolioId })
            .sort({ rule_code: 1 })
            .lean();
        return docs.map(toPayload);
    }
    async getOne(portfolioId, ruleId) {
        const doc = await this.model
            .findOne({ portfolio_id: portfolioId, ruleId })
            .lean();
        if (!doc) {
            throw new common_1.NotFoundException(`Rule ${ruleId} not found in this portfolio`);
        }
        return toPayload(doc);
    }
    async findByCode(portfolioId, ruleCode) {
        const code = ruleCode.trim();
        if (!code)
            return null;
        const doc = await this.model
            .findOne({
            portfolio_id: portfolioId,
            rule_code: { $regex: `^${escapeRegex(code)}$`, $options: 'i' },
        })
            .lean();
        return doc ? toPayload(doc) : null;
    }
    async create(dto) {
        const portfolioId = dto.portfolio_id.trim();
        const ruleCode = dto.rule_code.trim();
        const ruleName = dto.rule_name.trim();
        if (!portfolioId || !ruleCode || !ruleName) {
            throw new common_1.BadRequestException('portfolio_id, rule_code, and rule_name are required');
        }
        try {
            const doc = await this.model.create({
                ruleId: (0, ids_1.newCamRuleId)(),
                portfolio_id: portfolioId,
                rule_code: ruleCode,
                rule_name: ruleName,
                description: dto.description?.trim() || '',
                base_amount: dto.base_amount,
                base_year: dto.base_year,
                share_pct: dto.share_pct,
                admin_fee_pct: dto.admin_fee_pct === undefined ? null : dto.admin_fee_pct,
                exclusions: dto.exclusions ?? [],
                created_by: null,
            });
            return toPayload(doc.toObject());
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException(`Rule code "${ruleCode}" already exists in this portfolio`);
            }
            throw err;
        }
    }
    async update(portfolioId, ruleId, dto) {
        const doc = await this.model.findOne({
            ruleId,
            portfolio_id: portfolioId,
        });
        if (!doc) {
            throw new common_1.NotFoundException(`Rule ${ruleId} not found in this portfolio`);
        }
        if (dto.rule_code !== undefined)
            doc.rule_code = dto.rule_code.trim();
        if (dto.rule_name !== undefined)
            doc.rule_name = dto.rule_name.trim();
        if (dto.description !== undefined)
            doc.description = dto.description.trim();
        if (dto.base_amount !== undefined)
            doc.base_amount = dto.base_amount;
        if (dto.base_year !== undefined)
            doc.base_year = dto.base_year;
        if (dto.share_pct !== undefined)
            doc.share_pct = dto.share_pct;
        if (dto.admin_fee_pct !== undefined)
            doc.admin_fee_pct = dto.admin_fee_pct;
        if (dto.exclusions !== undefined)
            doc.exclusions = dto.exclusions;
        try {
            await doc.save();
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException(`Rule code conflicts with another rule in this portfolio`);
            }
            throw err;
        }
        return toPayload(doc.toObject());
    }
    async remove(portfolioId, ruleId) {
        const res = await this.model.deleteOne({
            ruleId,
            portfolio_id: portfolioId,
        });
        if (res.deletedCount === 0) {
            throw new common_1.NotFoundException(`Rule ${ruleId} not found in this portfolio`);
        }
        return { ok: true };
    }
};
exports.CamRulesService = CamRulesService;
exports.CamRulesService = CamRulesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cam_rule_schema_1.CamRule.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CamRulesService);
function toPayload(doc) {
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
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=cam-rules.service.js.map