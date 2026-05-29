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
exports.PortfolioService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const amendment_schema_1 = require("../lease/schemas/amendment.schema");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const property_schema_1 = require("../property/schemas/property.schema");
const property_alert_schema_1 = require("../tasks-alerts/schemas/property-alert.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const unit_schema_1 = require("../unit/schemas/unit.schema");
const portfolio_schema_1 = require("./schemas/portfolio.schema");
function newPortfolioId() {
    return `prt_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function newDocRequirementId() {
    return `doc_req_${(0, crypto_1.randomBytes)(4).toString('hex')}`;
}
function orgFilter(orgId) {
    if (!orgId)
        return { _id: null };
    return { organization_id: orgId };
}
let PortfolioService = class PortfolioService {
    constructor(portfolioModel, propertyModel, leaseModel, amendmentModel, taskAlertModel, propertyAlertModel, unitModel) {
        this.portfolioModel = portfolioModel;
        this.propertyModel = propertyModel;
        this.leaseModel = leaseModel;
        this.amendmentModel = amendmentModel;
        this.taskAlertModel = taskAlertModel;
        this.propertyAlertModel = propertyAlertModel;
        this.unitModel = unitModel;
    }
    async create(dto, userId, orgId) {
        if (!orgId) {
            throw new common_1.NotFoundException('Organization context required');
        }
        const p = dto.portfolio;
        const portfolioId = newPortfolioId();
        const document_requirements = p.document_requirements.map((d) => ({
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
            created_by: userId || 'unknown',
            organization_id: orgId,
        });
        return this.toResponse(doc);
    }
    async findAll(orgId) {
        const docs = await this.portfolioModel
            .find(orgFilter(orgId))
            .sort({ createdAt: -1 })
            .exec();
        const ids = docs.map((d) => d.portfolioId);
        const [countByPortfolio, alertStatusByPortfolio] = await Promise.all([
            this.countPropertiesByPortfolioIds(ids),
            this.computeAlertStatusByPortfolioIds(ids),
        ]);
        return {
            portfolios: docs.map((doc) => {
                const n = countByPortfolio.get(doc.portfolioId) ?? 0;
                const alertStatus = alertStatusByPortfolio.get(doc.portfolioId) ?? 'ok';
                return { ...this.toResponse(doc, n).portfolio, alert_status: alertStatus };
            }),
        };
    }
    async computeAlertStatusByPortfolioIds(portfolioIds) {
        const map = new Map();
        if (portfolioIds.length === 0)
            return map;
        const alerts = await this.taskAlertModel
            .find({
            portfolio_id: { $in: portfolioIds },
            is_resolved: false,
            severity: { $in: ['critical', 'high', 'medium'] },
        })
            .select({ portfolio_id: 1, severity: 1, _id: 0 })
            .lean()
            .exec();
        for (const alert of alerts) {
            const current = map.get(alert.portfolio_id);
            if (alert.severity === 'critical') {
                map.set(alert.portfolio_id, 'critical');
            }
            else if (current !== 'critical') {
                map.set(alert.portfolio_id, 'high');
            }
        }
        return map;
    }
    async countPropertiesByPortfolioIds(portfolioIds) {
        const map = new Map();
        if (portfolioIds.length === 0)
            return map;
        const rows = await this.propertyModel
            .aggregate([
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
    async existsByPortfolioId(portfolioId) {
        const n = await this.portfolioModel
            .countDocuments({ portfolioId })
            .exec();
        return n > 0;
    }
    async canUserAccess(portfolioIdRaw, orgId) {
        if (!orgId)
            return false;
        const portfolioId = portfolioIdRaw.trim();
        const n = await this.portfolioModel
            .countDocuments({ portfolioId, ...orgFilter(orgId) })
            .exec();
        return n > 0;
    }
    async findOne(portfolioIdRaw, orgId) {
        const portfolioId = portfolioIdRaw.trim();
        const doc = await this.portfolioModel
            .findOne({ portfolioId, ...orgFilter(orgId) })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        const countMap = await this.countPropertiesByPortfolioIds([portfolioId]);
        return {
            portfolio: this.toResponse(doc, countMap.get(portfolioId) ?? 0).portfolio,
        };
    }
    async update(portfolioIdRaw, dto, orgId) {
        const portfolioId = portfolioIdRaw.trim();
        const doc = await this.portfolioModel
            .findOne({ portfolioId, ...orgFilter(orgId) })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        const p = dto.portfolio;
        const document_requirements = p.document_requirements.map((d) => ({
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
            source: p.attributes?.source ?? doc.attributes?.source ?? 'ui',
        };
        await doc.save();
        const countMap = await this.countPropertiesByPortfolioIds([portfolioId]);
        return {
            portfolio: this.toResponse(doc, countMap.get(portfolioId) ?? 0).portfolio,
        };
    }
    async getDeletionImpact(portfolioIdRaw, orgId) {
        const portfolioId = portfolioIdRaw.trim();
        if (!(await this.canUserAccess(portfolioId, orgId))) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
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
    async remove(portfolioIdRaw, orgId) {
        const portfolioId = portfolioIdRaw.trim();
        if (!(await this.canUserAccess(portfolioId, orgId))) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        await this.taskAlertModel.deleteMany({ portfolio_id: portfolioId }).exec();
        await this.propertyAlertModel
            .deleteMany({ portfolio_id: portfolioId })
            .exec();
        await this.amendmentModel.deleteMany({ portfolio_id: portfolioId }).exec();
        await this.leaseModel.deleteMany({ portfolio_id: portfolioId }).exec();
        await this.unitModel.deleteMany({ portfolio_id: portfolioId }).exec();
        await this.propertyModel
            .deleteMany({
            $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
        })
            .exec();
        const del = await this.portfolioModel
            .deleteOne({ portfolioId })
            .exec();
        if (del.deletedCount === 0) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
    }
    toResponse(doc, propertyCount = 0) {
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
};
exports.PortfolioService = PortfolioService;
exports.PortfolioService = PortfolioService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(portfolio_schema_1.Portfolio.name)),
    __param(1, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(2, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __param(3, (0, mongoose_1.InjectModel)(amendment_schema_1.Amendment.name)),
    __param(4, (0, mongoose_1.InjectModel)(task_alert_schema_1.TaskAlert.name)),
    __param(5, (0, mongoose_1.InjectModel)(property_alert_schema_1.PropertyAlert.name)),
    __param(6, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PortfolioService);
//# sourceMappingURL=portfolio.service.js.map