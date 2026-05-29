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
var PropertyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const amendment_schema_1 = require("../lease/schemas/amendment.schema");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const portfolio_service_1 = require("../portfolio/portfolio.service");
const property_alert_schema_1 = require("../tasks-alerts/schemas/property-alert.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const unit_schema_1 = require("../unit/schemas/unit.schema");
const normalize_unit_code_util_1 = require("../unit/utils/normalize-unit-code.util");
const gcs_thumbnail_service_1 = require("./gcs-thumbnail.service");
const property_schema_1 = require("./schemas/property.schema");
function newPropertyId() {
    return `prp_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function newUnitId() {
    return `unt_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
const PLACEHOLDER_THUMBNAIL_PATH = '/static/placeholders/real-estate-building-and-home-property-logo-design-concept-illustration-vector.jpg';
let PropertyService = PropertyService_1 = class PropertyService {
    constructor(propertyModel, leaseModel, amendmentModel, taskAlertModel, propertyAlertModel, unitModel, portfolioService, gcsThumbnail, config) {
        this.propertyModel = propertyModel;
        this.leaseModel = leaseModel;
        this.amendmentModel = amendmentModel;
        this.taskAlertModel = taskAlertModel;
        this.propertyAlertModel = propertyAlertModel;
        this.unitModel = unitModel;
        this.portfolioService = portfolioService;
        this.gcsThumbnail = gcsThumbnail;
        this.config = config;
        this.logger = new common_1.Logger(PropertyService_1.name);
    }
    async create(dto, file) {
        const exists = await this.portfolioService.existsByPortfolioId(dto.portfolio_id);
        if (!exists) {
            throw new common_1.NotFoundException(`Portfolio not found: ${dto.portfolio_id}`);
        }
        const propertyId = newPropertyId();
        let thumbnail_url = null;
        try {
            const objectPath = await this.gcsThumbnail.uploadPropertyThumbnail(propertyId, file);
            if (objectPath) {
                thumbnail_url = this.buildAssetProxyUrl(objectPath);
            }
        }
        catch (err) {
            this.logger.warn('GCS thumbnail upload failed; using default placeholder image', err instanceof Error ? err.message : err);
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
        let defaultUnitId = null;
        try {
            const unit = await this.unitModel.create({
                unitId: newUnitId(),
                portfolio_id: dto.portfolio_id,
                property_id: propertyId,
                unit_code: (0, normalize_unit_code_util_1.normalizeUnitCode)('Main') || 'MAIN',
                unit_name: 'Main',
                building: null,
                premises: null,
                sqft_rentable: null,
                sqft_usable: null,
                parking_count: null,
                status: 'active',
                notes: null,
                is_default_migrated: true,
            });
            defaultUnitId = unit.unitId;
        }
        catch (err) {
            this.logger.warn(`Default unit creation failed for property ${propertyId}: ${String(err)}`);
        }
        return this.toResponse(doc, {
            unit_count: defaultUnitId ? 1 : 0,
            occupied_count: 0,
            default_unit_id: defaultUnitId,
        });
    }
    async listByPortfolioId(portfolioId) {
        const exists = await this.portfolioService.existsByPortfolioId(portfolioId);
        if (!exists) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        const docs = await this.propertyModel
            .find({
            $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
        })
            .sort({ createdAt: -1 })
            .exec();
        const propertyIds = docs.map((d) => d.propertyId);
        const unitStats = await this.aggregateUnitStats(portfolioId, propertyIds);
        return {
            properties: docs.map((doc) => this.toPropertyPayload(doc, unitStats.get(doc.propertyId))),
        };
    }
    async aggregateUnitStats(portfolioId, propertyIds) {
        const stats = new Map();
        if (propertyIds.length === 0)
            return stats;
        for (const pid of propertyIds) {
            stats.set(pid, {
                unit_count: 0,
                occupied_count: 0,
                default_unit_id: null,
            });
        }
        const units = await this.unitModel
            .find({
            portfolio_id: portfolioId,
            property_id: { $in: propertyIds },
        })
            .select({ unitId: 1, property_id: 1, status: 1, _id: 0 })
            .lean()
            .exec();
        const firstUnitByProperty = new Map();
        for (const u of units) {
            const bucket = stats.get(u.property_id);
            if (!bucket)
                continue;
            bucket.unit_count += 1;
            if (!firstUnitByProperty.has(u.property_id)) {
                firstUnitByProperty.set(u.property_id, u.unitId);
            }
        }
        const processedLeases = await this.leaseModel
            .find({
            portfolio_id: portfolioId,
            property_id: { $in: propertyIds },
            status: 'processed',
        })
            .select({ unit_id: 1, property_id: 1, _id: 0 })
            .lean()
            .exec();
        const occupiedUnitsByProperty = new Map();
        for (const l of processedLeases) {
            if (!l.unit_id || !l.property_id)
                continue;
            let set = occupiedUnitsByProperty.get(l.property_id);
            if (!set) {
                set = new Set();
                occupiedUnitsByProperty.set(l.property_id, set);
            }
            set.add(l.unit_id);
        }
        for (const [pid, bucket] of stats.entries()) {
            bucket.occupied_count =
                occupiedUnitsByProperty.get(pid)?.size ?? 0;
            if (bucket.unit_count === 1) {
                bucket.default_unit_id = firstUnitByProperty.get(pid) ?? null;
            }
        }
        return stats;
    }
    async getDeletionImpact(portfolioIdRaw, propertyIdRaw) {
        const portfolioId = portfolioIdRaw.trim();
        const propertyId = propertyIdRaw.trim();
        if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        if (!(await this.belongsToPortfolio(propertyId, portfolioId))) {
            throw new common_1.NotFoundException(`Property not found: ${propertyId}`);
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
    async remove(portfolioIdRaw, propertyIdRaw) {
        const portfolioId = portfolioIdRaw.trim();
        const propertyId = propertyIdRaw.trim();
        if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        if (!(await this.belongsToPortfolio(propertyId, portfolioId))) {
            throw new common_1.NotFoundException(`Property not found: ${propertyId}`);
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
        await this.unitModel
            .deleteMany({ portfolio_id: portfolioId, property_id: propertyId })
            .exec();
        const del = await this.propertyModel
            .deleteOne({
            propertyId,
            $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
        })
            .exec();
        if (del.deletedCount === 0) {
            throw new common_1.NotFoundException(`Property not found: ${propertyId}`);
        }
    }
    async belongsToPortfolio(propertyId, portfolioId) {
        const doc = await this.propertyModel
            .findOne({
            propertyId,
            $or: [{ portfolio_id: portfolioId }, { portfolioId: portfolioId }],
        })
            .exec();
        return doc != null;
    }
    defaultPropertyThumbnailUrl() {
        const raw = this.config.get('API_PUBLIC_URL')?.trim();
        const fromEnv = raw ? raw.replace(/\/$/, '') : '';
        const port = this.config.get('PORT')?.trim() ||
            process.env.PORT ||
            '3001';
        const base = fromEnv || `http://localhost:${port}`;
        return `${base}${PLACEHOLDER_THUMBNAIL_PATH}`;
    }
    buildAssetProxyUrl(objectPath) {
        const raw = this.config.get('API_PUBLIC_URL')?.trim();
        const fromEnv = raw ? raw.replace(/\/$/, '') : '';
        const port = this.config.get('PORT')?.trim() ||
            process.env.PORT ||
            '3001';
        const base = fromEnv || `http://localhost:${port}`;
        return `${base}/v1/properties/asset/${objectPath}`;
    }
    toResponse(doc, stats) {
        return {
            property: this.toPropertyPayload(doc, stats),
        };
    }
    toPropertyPayload(doc, stats) {
        const createdAt = doc.createdAt;
        const updatedAt = doc.updatedAt;
        return {
            id: doc.propertyId,
            portfolio_id: doc.portfolio_id,
            property_name: doc.property_name,
            address: doc.address,
            property_type: doc.property_type,
            thumbnail_url: doc.thumbnail_url,
            unit_count: stats?.unit_count,
            occupied_count: stats?.occupied_count,
            default_unit_id: stats?.default_unit_id ?? null,
            audit: {
                created_at: createdAt?.toISOString() ?? new Date().toISOString(),
                updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
            },
            links: {
                self: `/v1/properties/${doc.propertyId}`,
            },
        };
    }
};
exports.PropertyService = PropertyService;
exports.PropertyService = PropertyService = PropertyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(1, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __param(2, (0, mongoose_1.InjectModel)(amendment_schema_1.Amendment.name)),
    __param(3, (0, mongoose_1.InjectModel)(task_alert_schema_1.TaskAlert.name)),
    __param(4, (0, mongoose_1.InjectModel)(property_alert_schema_1.PropertyAlert.name)),
    __param(5, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        portfolio_service_1.PortfolioService,
        gcs_thumbnail_service_1.GcsThumbnailService,
        config_1.ConfigService])
], PropertyService);
//# sourceMappingURL=property.service.js.map