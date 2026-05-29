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
exports.ReconciliationController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const reconcile_dto_1 = require("../dto/reconcile.dto");
const reconciliation_service_1 = require("../services/reconciliation.service");
const require_query_1 = require("../utils/require-query");
let ReconciliationController = class ReconciliationController {
    constructor(svc) {
        this.svc = svc;
    }
    run(dto) {
        return this.svc.run({
            portfolio_id: dto.portfolio_id,
            property_id: dto.property_id,
            calendar_year: dto.calendar_year,
            unit_id: dto.unit_id,
            apply: dto.apply ?? false,
            apply_reason: dto.apply_reason,
            actor: dto.actor,
        });
    }
    list(portfolioId, propertyId, year, mode, limit) {
        return this.svc.listRuns({
            portfolio_id: (0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'),
            property_id: propertyId?.trim() || undefined,
            calendar_year: year ? Number(year) : undefined,
            mode,
            limit: limit ? Number(limit) : undefined,
        });
    }
    getOne(runId, portfolioId) {
        return this.svc.getRun((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), runId);
    }
};
exports.ReconciliationController = ReconciliationController;
__decorate([
    (0, common_1.Post)('run'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reconcile_dto_1.ReconcileYearDto]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "run", null);
__decorate([
    (0, common_1.Get)('runs'),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('mode')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('runs/:runId'),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "getOne", null);
exports.ReconciliationController = ReconciliationController = __decorate([
    (0, common_1.Controller)('cam/reconcile'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [reconciliation_service_1.ReconciliationService])
], ReconciliationController);
//# sourceMappingURL=reconciliation.controller.js.map