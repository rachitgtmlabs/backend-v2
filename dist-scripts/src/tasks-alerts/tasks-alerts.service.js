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
exports.TasksAlertsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const portfolio_service_1 = require("../portfolio/portfolio.service");
const property_service_1 = require("../property/property.service");
const property_alert_schema_1 = require("./schemas/property-alert.schema");
const task_alert_schema_1 = require("./schemas/task-alert.schema");
function newTaskItemId() {
    return `tka_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
function newAlertItemId() {
    return `ala_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
const SEVERITY_ORDER = [
    'critical',
    'high',
    'medium',
    'low',
];
function severityRank(severity) {
    const i = SEVERITY_ORDER.indexOf(severity);
    return i === -1 ? SEVERITY_ORDER.length : i;
}
let TasksAlertsService = class TasksAlertsService {
    constructor(propertyAlertModel, taskAlertModel, leaseModel, portfolioService, propertyService) {
        this.propertyAlertModel = propertyAlertModel;
        this.taskAlertModel = taskAlertModel;
        this.leaseModel = leaseModel;
        this.portfolioService = portfolioService;
        this.propertyService = propertyService;
    }
    async assertPortfolioAndProperty(portfolioId, propertyId) {
        const exists = await this.portfolioService.existsByPortfolioId(portfolioId);
        if (!exists) {
            throw new common_1.NotFoundException(`Portfolio not found: ${portfolioId}`);
        }
        const propertyOk = await this.propertyService.belongsToPortfolio(propertyId, portfolioId);
        if (!propertyOk) {
            throw new common_1.NotFoundException(`Property not found in portfolio: ${propertyId}`);
        }
    }
    async resolveLeaseId(portfolioId, propertyId, leaseId) {
        if (leaseId) {
            const lease = await this.leaseModel
                .findOne({
                leaseId,
                portfolio_id: portfolioId,
                property_id: propertyId,
            })
                .exec();
            if (!lease) {
                throw new common_1.NotFoundException(`Lease ${leaseId} not found for this portfolio and property.`);
            }
            return lease.leaseId;
        }
        const lease = await this.leaseModel
            .findOne({
            portfolio_id: portfolioId,
            property_id: propertyId,
        })
            .sort({ updatedAt: -1 })
            .exec();
        if (!lease) {
            throw new common_1.NotFoundException('No saved lease analysis for this property.');
        }
        return lease.leaseId;
    }
    mapToRowDto(doc) {
        return {
            id: doc.itemId,
            title: doc.title,
            severity: doc.severity,
            is_resolved: doc.is_resolved === true,
            ...(doc.details != null && doc.details !== ''
                ? { details: doc.details }
                : {}),
            ...(doc.sortOrder !== undefined && doc.sortOrder !== null
                ? { sortOrder: doc.sortOrder }
                : {}),
            ...(doc.alert_type != null && String(doc.alert_type).trim() !== ''
                ? { alert_type: String(doc.alert_type).trim() }
                : {}),
            ...(doc.due_timeline != null && String(doc.due_timeline).trim() !== ''
                ? { due_timeline: String(doc.due_timeline).trim() }
                : {}),
            ...(doc.suggested_action != null &&
                String(doc.suggested_action).trim() !== ''
                ? { suggested_action: String(doc.suggested_action).trim() }
                : {}),
        };
    }
    sortAlertRows(rows) {
        return [...rows].sort((a, b) => {
            const ar = a.is_resolved ? 1 : 0;
            const br = b.is_resolved ? 1 : 0;
            if (ar !== br)
                return ar - br;
            const sr = severityRank(a.severity) - severityRank(b.severity);
            if (sr !== 0)
                return sr;
            const ao = a.sortOrder ?? 1e9;
            const bo = b.sortOrder ?? 1e9;
            return ao - bo;
        });
    }
    sortTaskRows(rows) {
        return [...rows].sort((a, b) => {
            const ar = a.is_resolved ? 1 : 0;
            const br = b.is_resolved ? 1 : 0;
            if (ar !== br)
                return ar - br;
            const sr = severityRank(a.severity) - severityRank(b.severity);
            if (sr !== 0)
                return sr;
            const ao = a.sortOrder ?? 1e9;
            const bo = b.sortOrder ?? 1e9;
            return ao - bo;
        });
    }
    async findGrouped(portfolioId, propertyId, leaseId) {
        await this.assertPortfolioAndProperty(portfolioId, propertyId);
        const resolvedLeaseId = await this.resolveLeaseId(portfolioId, propertyId, leaseId);
        const [alertsNew, alertsLegacy, taskDocs] = await Promise.all([
            this.propertyAlertModel
                .find({
                portfolio_id: portfolioId,
                property_id: propertyId,
                lease_id: resolvedLeaseId,
            })
                .lean()
                .exec(),
            this.taskAlertModel
                .find({
                portfolio_id: portfolioId,
                property_id: propertyId,
                lease_id: resolvedLeaseId,
                category: 'alert',
            })
                .lean()
                .exec(),
            this.taskAlertModel
                .find({
                portfolio_id: portfolioId,
                property_id: propertyId,
                lease_id: resolvedLeaseId,
                category: 'task',
            })
                .lean()
                .exec(),
        ]);
        const alerts = [
            ...alertsNew.map((row) => this.mapToRowDto(row)),
            ...alertsLegacy.map((row) => this.mapToRowDto(row)),
        ];
        const tasks = taskDocs.map((row) => this.mapToRowDto(row));
        return {
            alerts: this.sortAlertRows(alerts),
            tasks: this.sortTaskRows(tasks),
        };
    }
    async create(propertyIdFromRoute, dto) {
        await this.resolveLeaseId(dto.portfolio_id.trim(), propertyIdFromRoute.trim(), dto.lease_id.trim());
        if (dto.category === 'alert') {
            const doc = await this.propertyAlertModel.create({
                itemId: newAlertItemId(),
                portfolio_id: dto.portfolio_id.trim(),
                property_id: propertyIdFromRoute.trim(),
                lease_id: dto.lease_id.trim(),
                title: dto.title.trim(),
                ...(dto.details != null && dto.details.trim() !== ''
                    ? { details: dto.details.trim() }
                    : {}),
                severity: dto.severity ?? 'medium',
                is_resolved: dto.is_resolved === true,
                ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
                ...(dto.alert_type != null && dto.alert_type.trim() !== ''
                    ? { alert_type: dto.alert_type.trim() }
                    : {}),
                ...(dto.due_timeline != null && dto.due_timeline.trim() !== ''
                    ? { due_timeline: dto.due_timeline.trim() }
                    : {}),
                ...(dto.suggested_action != null && dto.suggested_action.trim() !== ''
                    ? { suggested_action: dto.suggested_action.trim() }
                    : {}),
            });
            return { item: this.mapToRowDto(doc.toObject()) };
        }
        const doc = await this.taskAlertModel.create({
            itemId: newTaskItemId(),
            portfolio_id: dto.portfolio_id.trim(),
            property_id: propertyIdFromRoute.trim(),
            lease_id: dto.lease_id.trim(),
            category: 'task',
            title: dto.title.trim(),
            ...(dto.details != null && dto.details.trim() !== ''
                ? { details: dto.details.trim() }
                : {}),
            severity: dto.severity ?? 'medium',
            is_resolved: dto.is_resolved === true,
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        });
        return { item: this.mapToRowDto(doc.toObject()) };
    }
    async patchItem(propertyIdFromRoute, itemId, dto) {
        await this.assertPortfolioAndProperty(dto.portfolio_id.trim(), propertyIdFromRoute.trim());
        const resolvedLeaseId = await this.resolveLeaseId(dto.portfolio_id.trim(), propertyIdFromRoute.trim(), dto.lease_id.trim());
        const filter = {
            itemId,
            portfolio_id: dto.portfolio_id.trim(),
            property_id: propertyIdFromRoute.trim(),
            lease_id: resolvedLeaseId,
        };
        let doc = (await this.propertyAlertModel
            .findOneAndUpdate(filter, { $set: { is_resolved: dto.is_resolved } }, { new: true })
            .exec()) ?? null;
        if (!doc) {
            doc = await this.taskAlertModel
                .findOneAndUpdate(filter, { $set: { is_resolved: dto.is_resolved } }, { new: true })
                .exec();
        }
        if (!doc) {
            throw new common_1.NotFoundException('Task or alert item not found for this lease.');
        }
        return { item: this.mapToRowDto(doc.toObject()) };
    }
    async seedForNewLease(portfolioId, propertyId, leaseId, unitId = null) {
        const alertSeeds = [
            {
                severity: 'high',
                sortOrder: 0,
                title: 'Reconcile CAM pool definitions and caps against the landlord annual expense statement before the audit deadline.',
            },
            {
                severity: 'medium',
                sortOrder: 1,
                title: 'Confirm whether the expense stop applies to controllable CAM only and matches any letter of intent.',
            },
            {
                severity: 'low',
                sortOrder: 2,
                title: 'Track reconciliation delivery timing — many leases allow 120–180 days after fiscal year-end.',
            },
            {
                severity: 'medium',
                sortOrder: 3,
                title: 'Verify gross-up and vacancy assumptions used for CAM allocations match lease formulas.',
            },
        ];
        await this.propertyAlertModel.insertMany(alertSeeds.map((s) => ({
            itemId: newAlertItemId(),
            portfolio_id: portfolioId,
            property_id: propertyId,
            lease_id: leaseId,
            unit_id: unitId,
            title: s.title,
            severity: s.severity,
            sortOrder: s.sortOrder,
            is_resolved: false,
            ...(s.details ? { details: s.details } : {}),
        })));
    }
};
exports.TasksAlertsService = TasksAlertsService;
exports.TasksAlertsService = TasksAlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_alert_schema_1.PropertyAlert.name)),
    __param(1, (0, mongoose_1.InjectModel)(task_alert_schema_1.TaskAlert.name)),
    __param(2, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        portfolio_service_1.PortfolioService,
        property_service_1.PropertyService])
], TasksAlertsService);
//# sourceMappingURL=tasks-alerts.service.js.map