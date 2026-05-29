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
exports.UnitController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../auth/guards/portfolio-access.guard");
const create_unit_dto_1 = require("./dto/create-unit.dto");
const update_unit_dto_1 = require("./dto/update-unit.dto");
const unit_service_1 = require("./unit.service");
let UnitController = class UnitController {
    constructor(unitService) {
        this.unitService = unitService;
    }
    list(portfolioId, propertyId) {
        const pf = requireQuery(portfolioId, 'portfolio_id');
        const pr = requireQuery(propertyId, 'property_id');
        return this.unitService.listByProperty(pf, pr);
    }
    match(portfolioId, propertyId, hint) {
        const pf = requireQuery(portfolioId, 'portfolio_id');
        const pr = requireQuery(propertyId, 'property_id');
        const h = (hint ?? '').trim();
        return this.unitService.findMatch(pf, pr, h);
    }
    getOne(unitId, portfolioId) {
        const pf = requireQuery(portfolioId, 'portfolio_id');
        return this.unitService.getOne(pf, unitId);
    }
    create(body) {
        return this.unitService.create(body);
    }
    update(unitId, body) {
        return this.unitService.update(unitId, body);
    }
    async remove(unitId, portfolioId) {
        const pf = requireQuery(portfolioId, 'portfolio_id');
        await this.unitService.remove(pf, unitId);
    }
};
exports.UnitController = UnitController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnitController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('match'),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __param(2, (0, common_1.Query)('hint')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], UnitController.prototype, "match", null);
__decorate([
    (0, common_1.Get)(':unitId'),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UnitController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_unit_dto_1.CreateUnitDto]),
    __metadata("design:returntype", void 0)
], UnitController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':unitId'),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_unit_dto_1.UpdateUnitDto]),
    __metadata("design:returntype", void 0)
], UnitController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':unitId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UnitController.prototype, "remove", null);
exports.UnitController = UnitController = __decorate([
    (0, common_1.Controller)('units'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [unit_service_1.UnitService])
], UnitController);
function requireQuery(value, name) {
    const trimmed = value?.trim();
    if (!trimmed) {
        throw new common_1.BadRequestException(`Query parameter ${name} is required`);
    }
    return trimmed;
}
//# sourceMappingURL=unit.controller.js.map