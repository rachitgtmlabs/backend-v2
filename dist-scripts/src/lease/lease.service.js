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
var LeaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const portfolio_service_1 = require("../portfolio/portfolio.service");
const property_service_1 = require("../property/property.service");
const tasks_alerts_service_1 = require("../tasks-alerts/tasks-alerts.service");
const gcs_thumbnail_service_1 = require("../property/gcs-thumbnail.service");
const unit_service_1 = require("../unit/unit.service");
const lease_schema_1 = require("./schemas/lease.schema");
const amendment_schema_1 = require("./schemas/amendment.schema");
const deep_merge_util_1 = require("./utils/deep-merge.util");
const field_history_util_1 = require("./utils/field-history.util");
function newLeaseId() {
    return `les_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function newAmendmentId() {
    return `amd_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
let LeaseService = LeaseService_1 = class LeaseService {
    constructor(leaseModel, amendmentModel, portfolioService, propertyService, tasksAlertsService, gcsThumbnail, unitService) {
        this.leaseModel = leaseModel;
        this.amendmentModel = amendmentModel;
        this.portfolioService = portfolioService;
        this.propertyService = propertyService;
        this.tasksAlertsService = tasksAlertsService;
        this.gcsThumbnail = gcsThumbnail;
        this.unitService = unitService;
        this.logger = new common_1.Logger(LeaseService_1.name);
    }
    async create(dto, auth) {
        const exists = await this.portfolioService.existsByPortfolioId(dto.portfolio_id);
        if (!exists) {
            throw new common_1.NotFoundException(`Portfolio not found: ${dto.portfolio_id}`);
        }
        const propertyOk = await this.propertyService.belongsToPortfolio(dto.property_id, dto.portfolio_id);
        if (!propertyOk) {
            throw new common_1.NotFoundException(`Property not found in portfolio: ${dto.property_id}`);
        }
        if (dto.document_type === 'amendment') {
            return this.createAmendment(dto, auth?.userEmail ?? null);
        }
        const unitId = await this.resolveUnitIdForNewLease(dto);
        return this.createLease(dto, unitId);
    }
    async resolveUnitIdForNewLease(dto) {
        const explicit = dto.unit_id?.trim();
        if (explicit) {
            const owned = await this.unitService.findInPortfolioProperty(dto.portfolio_id, dto.property_id, explicit);
            if (!owned) {
                throw new common_1.BadRequestException({
                    message: `Unit ${explicit} does not belong to property ${dto.property_id}`,
                    code: 'UNIT_NOT_ON_PROPERTY',
                });
            }
            return owned.unitId;
        }
        const sole = await this.unitService.resolveSoleActiveUnit(dto.portfolio_id, dto.property_id);
        if (sole)
            return sole.unitId;
        const { units } = await this.unitService.listByProperty(dto.portfolio_id, dto.property_id);
        throw new common_1.BadRequestException({
            message: units.length === 0
                ? 'No unit exists on this property. Create a unit before saving a lease.'
                : 'Property has multiple units; unit_id is required.',
            code: units.length === 0 ? 'NO_UNITS_ON_PROPERTY' : 'UNIT_ID_REQUIRED',
            units,
        });
    }
    async createAmendment(dto, userEmail) {
        const parentLease = await this.leaseModel
            .findOne({
            property_id: dto.property_id,
        })
            .sort({ updatedAt: -1 })
            .exec();
        if (!parentLease) {
            throw new common_1.BadRequestException('Cannot create amendment: No lease exists for this property');
        }
        const newVersion = parentLease.amendment_version + 1;
        const isManualEdit = !dto.gcs_document_path?.trim() && Boolean(userEmail);
        if (isManualEdit) {
            this.logger.log(`Creating manual amendment without source file (edited_by=${userEmail})`);
        }
        const amendmentId = newAmendmentId();
        const amendmentDoc = await this.amendmentModel.create({
            amendmentId,
            lease_id: parentLease.leaseId,
            version: newVersion,
            portfolio_id: dto.portfolio_id,
            property_id: dto.property_id,
            unit_id: parentLease.unit_id ?? null,
            status: dto.status,
            file_name: dto.file_name,
            lease_information: dto.lease_information,
            analysis: dto.analysis,
            gcs_document_path: dto.gcs_document_path ?? null,
            drafted_amendments: dto.drafted_amendments ?? [],
            edited_by: isManualEdit ? userEmail : null,
        });
        await this.leaseModel.updateOne({ leaseId: parentLease.leaseId }, { $inc: { amendment_version: 1 } });
        const createdAt = amendmentDoc.createdAt;
        const updatedAt = amendmentDoc.updatedAt;
        return {
            amendment: {
                id: amendmentDoc.amendmentId,
                lease_id: amendmentDoc.lease_id,
                version: amendmentDoc.version,
                portfolio_id: amendmentDoc.portfolio_id,
                property_id: amendmentDoc.property_id,
                unit_id: amendmentDoc.unit_id ?? null,
                status: amendmentDoc.status,
                file_name: amendmentDoc.file_name,
                audit: {
                    created_at: createdAt?.toISOString() ?? new Date().toISOString(),
                    updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
                },
                links: {
                    self: `/v1/amendments/${amendmentDoc.amendmentId}`,
                    parent_lease: `/v1/leases/${parentLease.leaseId}`,
                },
            },
        };
    }
    async createLease(dto, unitId) {
        const existingLease = await this.leaseModel
            .findOne({ unit_id: unitId })
            .sort({ updatedAt: -1 })
            .exec();
        if (existingLease) {
            await this.leaseModel.updateOne({ leaseId: existingLease.leaseId }, { status: 'draft' });
            await this.amendmentModel.updateMany({ lease_id: existingLease.leaseId }, { status: 'draft' });
        }
        const leaseId = newLeaseId();
        const doc = await this.leaseModel.create({
            leaseId,
            portfolio_id: dto.portfolio_id,
            property_id: dto.property_id,
            unit_id: unitId,
            status: dto.status,
            file_name: dto.file_name,
            lease_information: dto.lease_information,
            analysis: dto.analysis,
            amendment_version: 0,
            gcs_document_path: dto.gcs_document_path ?? null,
            drafted_amendments: dto.drafted_amendments ?? [],
        });
        try {
            await this.tasksAlertsService.seedForNewLease(dto.portfolio_id, dto.property_id, leaseId, unitId);
        }
        catch (err) {
            this.logger.warn(`Tasks/alerts seed failed for lease ${leaseId}: ${String(err)}`);
        }
        const createdAt = doc.createdAt;
        const updatedAt = doc.updatedAt;
        return {
            lease: {
                id: doc.leaseId,
                portfolio_id: doc.portfolio_id,
                property_id: doc.property_id,
                unit_id: doc.unit_id,
                status: doc.status,
                file_name: doc.file_name,
                amendment_version: doc.amendment_version,
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
    async getLatestForPortfolioProperty(portfolioId, propertyId) {
        const propertyOk = await this.propertyService.belongsToPortfolio(propertyId, portfolioId);
        if (!propertyOk) {
            throw new common_1.NotFoundException(`Property ${propertyId} not found in portfolio ${portfolioId}`);
        }
        const doc = await this.leaseModel
            .findOne({
            portfolio_id: portfolioId,
            property_id: propertyId,
        })
            .sort({ updatedAt: -1 })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException('No saved lease analysis for this property.');
        }
        const amendmentDocs = await this.amendmentModel
            .find({ lease_id: doc.leaseId })
            .sort({ version: 1 })
            .exec();
        const multiUnit = await this.unitService
            .listByProperty(portfolioId, propertyId)
            .then((res) => res.units.filter((u) => u.status === 'active').length > 1)
            .catch(() => false);
        const createdAt = doc.createdAt;
        const updatedAt = doc.updatedAt;
        return {
            lease: {
                id: doc.leaseId,
                portfolio_id: doc.portfolio_id,
                property_id: doc.property_id,
                unit_id: doc.unit_id ?? null,
                status: doc.status,
                file_name: doc.file_name,
                gcs_document_path: doc.gcs_document_path ?? null,
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
            amendments: amendmentDocs.map((a) => ({
                id: a.amendmentId,
                version: a.version,
                file_name: a.file_name,
                gcs_document_path: a.gcs_document_path ?? null,
                drafted_amendments: a.drafted_amendments ?? [],
            })),
            multi_unit: multiUnit,
        };
    }
    async getLatestForPortfolioUnit(portfolioId, unitId) {
        const unit = await this.unitService.getOne(portfolioId, unitId);
        const doc = await this.leaseModel
            .findOne({ portfolio_id: portfolioId, unit_id: unit.unit.id })
            .sort({ updatedAt: -1 })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException('No saved lease analysis for this unit.');
        }
        const amendmentDocs = await this.amendmentModel
            .find({ lease_id: doc.leaseId })
            .sort({ version: 1 })
            .exec();
        const createdAt = doc.createdAt;
        const updatedAt = doc.updatedAt;
        return {
            lease: {
                id: doc.leaseId,
                portfolio_id: doc.portfolio_id,
                property_id: doc.property_id,
                unit_id: doc.unit_id ?? null,
                status: doc.status,
                file_name: doc.file_name,
                gcs_document_path: doc.gcs_document_path ?? null,
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
            amendments: amendmentDocs.map((a) => ({
                id: a.amendmentId,
                version: a.version,
                file_name: a.file_name,
                gcs_document_path: a.gcs_document_path ?? null,
                drafted_amendments: a.drafted_amendments ?? [],
            })),
        };
    }
    async listDocumentsForPortfolioProperty(portfolioId, propertyId) {
        const propertyOk = await this.propertyService.belongsToPortfolio(propertyId, portfolioId);
        if (!propertyOk) {
            throw new common_1.NotFoundException(`Property ${propertyId} not found in portfolio ${portfolioId}`);
        }
        const [leaseRows, amendmentRows] = await Promise.all([
            this.leaseModel
                .find({ portfolio_id: portfolioId, property_id: propertyId })
                .sort({ updatedAt: -1 })
                .select(['leaseId', 'file_name', 'status', 'updatedAt'])
                .lean()
                .exec(),
            this.amendmentModel
                .find({ portfolio_id: portfolioId, property_id: propertyId })
                .sort({ updatedAt: -1 })
                .select(['amendmentId', 'file_name', 'status', 'updatedAt'])
                .lean()
                .exec(),
        ]);
        const leaseItems = leaseRows.map((row) => ({
            id: row.leaseId,
            kind: 'lease',
            file_name: row.file_name,
            status: row.status,
            updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));
        const amendmentItems = amendmentRows.map((row) => ({
            id: row.amendmentId,
            kind: 'amendment',
            file_name: row.file_name,
            status: row.status,
            updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));
        const all = [...leaseItems, ...amendmentItems];
        const byUpdatedDesc = (a, b) => b.updated_at.localeCompare(a.updated_at);
        const active = all
            .filter((i) => i.status === 'processed')
            .sort(byUpdatedDesc);
        const draft = all.filter((i) => i.status === 'draft').sort(byUpdatedDesc);
        return { active, draft };
    }
    async listDocumentsForPortfolioUnit(portfolioId, unitId) {
        await this.unitService.getOne(portfolioId, unitId);
        const [leaseRows, amendmentRows] = await Promise.all([
            this.leaseModel
                .find({ portfolio_id: portfolioId, unit_id: unitId })
                .sort({ updatedAt: -1 })
                .select(['leaseId', 'file_name', 'status', 'updatedAt'])
                .lean()
                .exec(),
            this.amendmentModel
                .find({ portfolio_id: portfolioId, unit_id: unitId })
                .sort({ updatedAt: -1 })
                .select(['amendmentId', 'file_name', 'status', 'updatedAt'])
                .lean()
                .exec(),
        ]);
        const leaseItems = leaseRows.map((row) => ({
            id: row.leaseId,
            kind: 'lease',
            file_name: row.file_name,
            status: row.status,
            updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));
        const amendmentItems = amendmentRows.map((row) => ({
            id: row.amendmentId,
            kind: 'amendment',
            file_name: row.file_name,
            status: row.status,
            updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));
        const all = [...leaseItems, ...amendmentItems];
        const byUpdatedDesc = (a, b) => b.updated_at.localeCompare(a.updated_at);
        const active = all
            .filter((i) => i.status === 'processed')
            .sort(byUpdatedDesc);
        const draft = all.filter((i) => i.status === 'draft').sort(byUpdatedDesc);
        return { active, draft };
    }
    async getEffectiveState(leaseId) {
        const lease = await this.leaseModel
            .findOne({ leaseId })
            .exec();
        if (!lease) {
            throw new common_1.NotFoundException(`Lease not found: ${leaseId}`);
        }
        const amendments = await this.amendmentModel
            .find({ lease_id: leaseId })
            .sort({ version: 1 })
            .exec();
        let effectiveLeaseInfo = { ...(lease.lease_information || {}) };
        let effectiveAnalysis = { ...(lease.analysis || {}) };
        for (const amendment of amendments) {
            if (amendment.lease_information) {
                effectiveLeaseInfo = (0, deep_merge_util_1.deepMerge)(effectiveLeaseInfo, amendment.lease_information);
            }
            if (amendment.analysis) {
                effectiveAnalysis = (0, deep_merge_util_1.deepMerge)(effectiveAnalysis, amendment.analysis);
            }
        }
        const amendmentHistory = amendments.map((a) => ({
            version: a.version,
            amendmentId: a.amendmentId,
            file_name: a.file_name,
            status: a.status,
            gcs_document_path: a.gcs_document_path ?? null,
            changedSections: Object.keys(a.analysis || {}),
            updated_at: a.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));
        const createdAt = lease.createdAt;
        const updatedAt = lease.updatedAt;
        return {
            leaseId: lease.leaseId,
            currentVersion: amendments.length,
            effectiveLeaseInfo,
            effectiveAnalysis,
            lease: {
                id: lease.leaseId,
                portfolio_id: lease.portfolio_id,
                property_id: lease.property_id,
                unit_id: lease.unit_id ?? null,
                status: lease.status,
                file_name: lease.file_name,
                gcs_document_path: lease.gcs_document_path ?? null,
                amendment_version: lease.amendment_version,
                created_at: createdAt?.toISOString() ?? new Date().toISOString(),
                updated_at: updatedAt?.toISOString() ?? new Date().toISOString(),
            },
            amendments: amendmentHistory,
        };
    }
    async getEffectiveStateByUnit(portfolioId, unitId) {
        await this.unitService.getOne(portfolioId, unitId);
        const lease = await this.leaseModel
            .findOne({ portfolio_id: portfolioId, unit_id: unitId, status: 'processed' })
            .sort({ updatedAt: -1 })
            .exec();
        if (!lease) {
            throw new common_1.NotFoundException('No processed lease found for this unit.');
        }
        return this.getEffectiveState(lease.leaseId);
    }
    async getEffectiveStateByProperty(portfolioId, propertyId) {
        const propertyOk = await this.propertyService.belongsToPortfolio(propertyId, portfolioId);
        if (!propertyOk) {
            throw new common_1.NotFoundException(`Property ${propertyId} not found in portfolio ${portfolioId}`);
        }
        const lease = await this.leaseModel
            .findOne({
            portfolio_id: portfolioId,
            property_id: propertyId,
            status: 'processed',
        })
            .sort({ updatedAt: -1 })
            .exec();
        if (!lease) {
            throw new common_1.NotFoundException('No processed lease found for this property.');
        }
        return this.getEffectiveState(lease.leaseId);
    }
    async getAmendment(amendmentId) {
        const amendment = await this.amendmentModel
            .findOne({ amendmentId })
            .exec();
        if (!amendment) {
            throw new common_1.NotFoundException(`Amendment not found: ${amendmentId}`);
        }
        return {
            amendment: {
                id: amendment.amendmentId,
                lease_id: amendment.lease_id,
                version: amendment.version,
                portfolio_id: amendment.portfolio_id,
                property_id: amendment.property_id,
                status: amendment.status,
                file_name: amendment.file_name,
                lease_information: amendment.lease_information,
                analysis: amendment.analysis,
                audit: {
                    created_at: amendment.createdAt?.toISOString() ?? new Date().toISOString(),
                    updated_at: amendment.updatedAt?.toISOString() ?? new Date().toISOString(),
                },
            },
        };
    }
    async downloadDocument(objectPath) {
        if (!objectPath.startsWith('documents/')) {
            throw new common_1.BadRequestException('Invalid document path');
        }
        const result = await this.gcsThumbnail.downloadFile(objectPath);
        if (!result) {
            throw new common_1.NotFoundException('Document not found or storage not configured');
        }
        return result;
    }
    async getFieldHistory(leaseId) {
        const lease = await this.leaseModel.findOne({ leaseId }).exec();
        if (!lease) {
            throw new common_1.NotFoundException(`Lease not found: ${leaseId}`);
        }
        const amendments = await this.amendmentModel
            .find({ lease_id: leaseId })
            .sort({ version: 1 })
            .exec();
        const originalEffectiveDate = lease.createdAt?.toISOString() ?? new Date().toISOString();
        return (0, field_history_util_1.buildFieldHistory)({
            leaseId: lease.leaseId,
            originalAnalysis: (lease.analysis ?? {}),
            originalEffectiveDate,
            amendments: amendments.map((a) => ({
                amendmentId: a.amendmentId,
                version: a.version,
                analysisDelta: (a.analysis ?? undefined),
                effectiveDate: a.createdAt?.toISOString() ?? new Date().toISOString(),
                editedBy: a.edited_by ?? null,
                draftedAddendums: (a.drafted_amendments ?? []).map((d) => ({
                    key: d.key,
                    riskTitle: d.riskTitle,
                    riskSeverity: d.riskSeverity,
                    resolutionLabel: d.resolutionLabel,
                    markdown: d.markdown,
                    generatedAt: d.generatedAt,
                })),
            })),
            originalDraftedAddendums: (lease.drafted_amendments ?? []).map((d) => ({
                key: d.key,
                riskTitle: d.riskTitle,
                riskSeverity: d.riskSeverity,
                resolutionLabel: d.resolutionLabel,
                markdown: d.markdown,
                generatedAt: d.generatedAt,
            })),
        });
    }
    async listAmendments(leaseId) {
        const lease = await this.leaseModel
            .findOne({ leaseId })
            .exec();
        if (!lease) {
            throw new common_1.NotFoundException(`Lease not found: ${leaseId}`);
        }
        const amendments = await this.amendmentModel
            .find({ lease_id: leaseId })
            .sort({ version: 1 })
            .exec();
        return {
            lease_id: leaseId,
            amendments: amendments.map((a) => ({
                id: a.amendmentId,
                version: a.version,
                status: a.status,
                file_name: a.file_name,
                changedSections: Object.keys(a.analysis || {}),
                audit: {
                    created_at: a.createdAt?.toISOString() ?? new Date().toISOString(),
                    updated_at: a.updatedAt?.toISOString() ?? new Date().toISOString(),
                },
            })),
        };
    }
};
exports.LeaseService = LeaseService;
exports.LeaseService = LeaseService = LeaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __param(1, (0, mongoose_1.InjectModel)(amendment_schema_1.Amendment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        portfolio_service_1.PortfolioService,
        property_service_1.PropertyService,
        tasks_alerts_service_1.TasksAlertsService,
        gcs_thumbnail_service_1.GcsThumbnailService,
        unit_service_1.UnitService])
], LeaseService);
//# sourceMappingURL=lease.service.js.map