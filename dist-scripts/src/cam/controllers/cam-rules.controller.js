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
exports.CamRulesController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const cam_rule_dto_1 = require("../dto/cam-rule.dto");
const cam_rules_service_1 = require("../services/cam-rules.service");
const require_query_1 = require("../utils/require-query");
let CamRulesController = class CamRulesController {
    constructor(svc) {
        this.svc = svc;
    }
    list(portfolioId) {
        return this.svc.listForPortfolio((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'));
    }
    getByCode(ruleCode, portfolioId) {
        return this.svc.findByCode((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), ruleCode);
    }
    getOne(ruleId, portfolioId) {
        return this.svc.getOne((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), ruleId);
    }
    create(dto) {
        return this.svc.create(dto);
    }
    update(ruleId, portfolioId, dto) {
        return this.svc.update((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), ruleId, dto);
    }
    delete(ruleId, portfolioId) {
        return this.svc.remove((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), ruleId);
    }
};
exports.CamRulesController = CamRulesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('by-code/:ruleCode'),
    __param(0, (0, common_1.Param)('ruleCode')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "getByCode", null);
__decorate([
    (0, common_1.Get)(':ruleId'),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cam_rule_dto_1.CreateCamRuleDto]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':ruleId'),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, cam_rule_dto_1.UpdateCamRuleDto]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':ruleId'),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CamRulesController.prototype, "delete", null);
exports.CamRulesController = CamRulesController = __decorate([
    (0, common_1.Controller)('cam/rules'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [cam_rules_service_1.CamRulesService])
], CamRulesController);
//# sourceMappingURL=cam-rules.controller.js.map