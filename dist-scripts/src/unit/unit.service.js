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
var UnitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const portfolio_service_1 = require("../portfolio/portfolio.service");
const property_service_1 = require("../property/property.service");
const unit_schema_1 = require("./schemas/unit.schema");
const normalize_unit_code_util_1 = require("./utils/normalize-unit-code.util");
function newUnitId() {
    return `unt_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
const FUZZY_MATCH_DISTANCE_THRESHOLD = 2;
let UnitService = UnitService_1 = class UnitService {
    constructor(unitModel, portfolioService, propertyService) {
        this.unitModel = unitModel;
        this.portfolioService = portfolioService;
        this.propertyService = propertyService;
        this.logger = new common_1.Logger(UnitService_1.name);
    }
    async create(dto) {
        const portfolioId = dto.portfolio_id.trim();
        const propertyId = dto.property_id.trim();
        await this.ensurePortfolioPropertyPair(portfolioId, propertyId);
        const rawCode = dto.unit_code.trim();
        if (!rawCode) {
            throw new common_1.BadRequestException('unit_code is required');
        }
        const normalized = (0, normalize_unit_code_util_1.normalizeUnitCode)(rawCode);
        if (!normalized) {
            throw new common_1.BadRequestException('unit_code is required');
        }
        const unitName = dto.unit_name?.trim() || rawCode;
        try {
            const doc = await this.unitModel.create({
                unitId: newUnitId(),
                portfolio_id: portfolioId,
                property_id: propertyId,
                unit_code: normalized,
                unit_name: unitName,
                unit_type: dto.unit_type ?? null,
                floor: dto.floor?.trim() || null,
                building: dto.building ?? null,
                premises: dto.premises ?? null,
                sqft_rentable: dto.sqft_rentable ?? null,
                sqft_usable: dto.sqft_usable ?? null,
                parking_count: dto.parking_count ?? null,
                status: dto.status ?? 'active',
                notes: dto.notes ?? null,
                is_default_migrated: false,
            });
            return { unit: this.toUnitPayload(doc) };
        }
        catch (err) {
            if (isDuplicateKeyError(err)) {
                const existing = await this.unitModel
                    .findOne({ property_id: propertyId, unit_code: normalized })
                    .collation({ locale: 'en', strength: 2 })
                    .exec();
                if (existing) {
                    throw new common_1.ConflictException({
                        message: `A unit with code "${normalized}" already exists on this property`,
                        existing: this.toUnitPayload(existing),
                    });
                }
                throw new common_1.ConflictException('Unit code already exists on this property');
            }
            throw err;
        }
    }
    async listByProperty(portfolioId, propertyId) {
        const pf = portfolioId.trim();
        const pr = propertyId.trim();
        await this.ensurePortfolioPropertyPair(pf, pr);
        const docs = await this.unitModel
            .find({ portfolio_id: pf, property_id: pr })
            .sort({ status: 1, createdAt: 1 })
            .exec();
        return { units: docs.map((d) => this.toUnitPayload(d)) };
    }
    async getOne(portfolioId, unitId) {
        const doc = await this.findInPortfolioOrThrow(portfolioId.trim(), unitId.trim());
        return { unit: this.toUnitPayload(doc) };
    }
    async update(unitId, dto) {
        const portfolioId = dto.portfolio_id.trim();
        const doc = await this.findInPortfolioOrThrow(portfolioId, unitId.trim());
        if (dto.unit_name !== undefined)
            doc.unit_name = dto.unit_name.trim();
        if (dto.unit_code !== undefined) {
            const normalized = (0, normalize_unit_code_util_1.normalizeUnitCode)(dto.unit_code);
            if (!normalized) {
                throw new common_1.BadRequestException('unit_code cannot be empty');
            }
            doc.unit_code = normalized;
        }
        if (dto.unit_type !== undefined)
            doc.unit_type = dto.unit_type;
        if (dto.floor !== undefined)
            doc.floor = dto.floor || null;
        if (dto.building !== undefined)
            doc.building = dto.building || null;
        if (dto.premises !== undefined)
            doc.premises = dto.premises || null;
        if (dto.sqft_rentable !== undefined)
            doc.sqft_rentable = dto.sqft_rentable;
        if (dto.sqft_usable !== undefined)
            doc.sqft_usable = dto.sqft_usable;
        if (dto.parking_count !== undefined)
            doc.parking_count = dto.parking_count;
        if (dto.status !== undefined)
            doc.status = dto.status;
        if (dto.notes !== undefined)
            doc.notes = dto.notes || null;
        try {
            const saved = await doc.save();
            return { unit: this.toUnitPayload(saved) };
        }
        catch (err) {
            if (isDuplicateKeyError(err)) {
                throw new common_1.ConflictException('Another unit on this property already uses that code');
            }
            throw err;
        }
    }
    async remove(portfolioId, unitId) {
        const doc = await this.findInPortfolioOrThrow(portfolioId.trim(), unitId.trim());
        await this.unitModel.deleteOne({ unitId: doc.unitId }).exec();
    }
    async findMatch(portfolioId, propertyId, hint) {
        const pf = portfolioId.trim();
        const pr = propertyId.trim();
        await this.ensurePortfolioPropertyPair(pf, pr);
        const normalizedHint = (0, normalize_unit_code_util_1.normalizeUnitCode)(hint);
        if (!normalizedHint) {
            return { matched: false, unit: null, candidates: [] };
        }
        const docs = await this.unitModel
            .find({ portfolio_id: pf, property_id: pr, status: 'active' })
            .exec();
        if (docs.length === 0) {
            return { matched: false, unit: null, candidates: [] };
        }
        const scored = docs
            .map((d) => ({
            doc: d,
            score: levenshtein(normalizedHint, d.unit_code),
        }))
            .sort((a, b) => a.score - b.score);
        const top = scored[0];
        const matched = top.score === 0 ||
            (top.score <= FUZZY_MATCH_DISTANCE_THRESHOLD &&
                (scored[1]?.score ?? Infinity) > top.score);
        return {
            matched,
            unit: matched ? this.toUnitPayload(top.doc) : null,
            candidates: scored.slice(0, 3).map(({ doc, score }) => ({
                ...this.toUnitPayload(doc),
                score,
            })),
        };
    }
    async resolveSoleActiveUnit(portfolioId, propertyId) {
        const docs = await this.unitModel
            .find({ portfolio_id: portfolioId, property_id: propertyId, status: 'active' })
            .limit(2)
            .exec();
        return docs.length === 1 ? docs[0] : null;
    }
    async findInPortfolioProperty(portfolioId, propertyId, unitId) {
        return this.unitModel
            .findOne({
            unitId,
            portfolio_id: portfolioId,
            property_id: propertyId,
        })
            .exec();
    }
    async countsByPropertyIds(portfolioId, propertyIds) {
        const map = new Map();
        if (propertyIds.length === 0)
            return map;
        const docs = await this.unitModel
            .find({ portfolio_id: portfolioId, property_id: { $in: propertyIds } })
            .select({ unitId: 1, property_id: 1, status: 1, _id: 0 })
            .lean()
            .exec();
        for (const pid of propertyIds) {
            map.set(pid, { unit_count: 0, active_count: 0, default_unit_id: null });
        }
        const firstUnitByProperty = new Map();
        for (const d of docs) {
            const bucket = map.get(d.property_id);
            if (!bucket)
                continue;
            bucket.unit_count += 1;
            if (d.status === 'active')
                bucket.active_count += 1;
            if (!firstUnitByProperty.has(d.property_id)) {
                firstUnitByProperty.set(d.property_id, d.unitId);
            }
        }
        for (const [pid, bucket] of map.entries()) {
            if (bucket.unit_count === 1) {
                bucket.default_unit_id = firstUnitByProperty.get(pid) ?? null;
            }
        }
        return map;
    }
    toUnitPayload(doc) {
        return {
            id: doc.unitId,
            portfolio_id: doc.portfolio_id,
            property_id: doc.property_id,
            unit_code: doc.unit_code,
            unit_name: doc.unit_name,
            unit_type: doc.unit_type,
            floor: doc.floor,
            building: doc.building,
            premises: doc.premises,
            sqft_rentable: doc.sqft_rentable,
            sqft_usable: doc.sqft_usable,
            parking_count: doc.parking_count,
            status: doc.status,
            notes: doc.notes,
            is_default_migrated: doc.is_default_migrated,
            audit: {
                created_at: doc.createdAt?.toISOString() ?? new Date().toISOString(),
                updated_at: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
            },
            links: {
                self: `/v1/units/${doc.unitId}`,
            },
        };
    }
    async ensurePortfolioPropertyPair(portfolioId, propertyId) {
        if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        if (!(await this.propertyService.belongsToPortfolio(propertyId, portfolioId))) {
            throw new common_1.NotFoundException(`Property not found: ${propertyId}`);
        }
    }
    async findInPortfolioOrThrow(portfolioId, unitId) {
        const doc = await this.unitModel
            .findOne({ unitId, portfolio_id: portfolioId })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException(`Unit not found: ${unitId}`);
        }
        return doc;
    }
};
exports.UnitService = UnitService;
exports.UnitService = UnitService = UnitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        portfolio_service_1.PortfolioService,
        property_service_1.PropertyService])
], UnitService);
function isDuplicateKeyError(err) {
    return (typeof err === 'object' &&
        err !== null &&
        err.code === 11000);
}
function levenshtein(a, b) {
    if (a === b)
        return 0;
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j += 1)
        prev[j] = j;
    for (let i = 1; i <= a.length; i += 1) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
}
//# sourceMappingURL=unit.service.js.map