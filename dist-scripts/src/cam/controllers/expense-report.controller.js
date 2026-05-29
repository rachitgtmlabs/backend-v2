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
exports.ExpenseReportController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const expense_report_service_1 = require("../services/expense-report.service");
const require_query_1 = require("../utils/require-query");
let ExpenseReportController = class ExpenseReportController {
    constructor(svc) {
        this.svc = svc;
    }
    byCategory(portfolioId, propertyId, unitId, year, from, to) {
        const currentYear = new Date().getUTCFullYear();
        return this.svc.reportByCategory({
            portfolio_id: (0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'),
            property_id: (0, require_query_1.requireQuery)(propertyId, 'property_id'),
            unit_id: unitId?.trim() || undefined,
            calendar_year: year
                ? Number(year)
                : from || to
                    ? undefined
                    : currentYear,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
        });
    }
    drilldown(category, portfolioId, propertyId, unitId, year) {
        return this.svc.drilldown({
            portfolio_id: (0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'),
            property_id: (0, require_query_1.requireQuery)(propertyId, 'property_id'),
            category: decodeURIComponent(category),
            unit_id: unitId?.trim() || undefined,
            calendar_year: year ? Number(year) : undefined,
        });
    }
};
exports.ExpenseReportController = ExpenseReportController;
__decorate([
    (0, common_1.Get)('by-category'),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __param(2, (0, common_1.Query)('unit_id')),
    __param(3, (0, common_1.Query)('year')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ExpenseReportController.prototype, "byCategory", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    __param(0, (0, common_1.Param)('category')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Query)('property_id')),
    __param(3, (0, common_1.Query)('unit_id')),
    __param(4, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ExpenseReportController.prototype, "drilldown", null);
exports.ExpenseReportController = ExpenseReportController = __decorate([
    (0, common_1.Controller)('cam/report'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [expense_report_service_1.ExpenseReportService])
], ExpenseReportController);
//# sourceMappingURL=expense-report.controller.js.map