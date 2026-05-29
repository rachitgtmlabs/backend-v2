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
exports.TenantInvoicesController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const invoice_actions_dto_1 = require("../dto/invoice-actions.dto");
const tenant_invoices_service_1 = require("../services/tenant-invoices.service");
const require_query_1 = require("../utils/require-query");
let TenantInvoicesController = class TenantInvoicesController {
    constructor(svc) {
        this.svc = svc;
    }
    list(portfolioId, propertyId, unitId, year, category, variance, kind, reconciled, limit) {
        return this.svc.list({
            portfolio_id: (0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'),
            property_id: propertyId?.trim() || undefined,
            unit_id: unitId?.trim() || undefined,
            calendar_year: year ? Number(year) : undefined,
            expense_category: category?.trim() || undefined,
            variance_tag: variance,
            invoice_kind: kind,
            reconciled: reconciled === 'true' ? true : reconciled === 'false' ? false : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    getOne(invoiceId, portfolioId) {
        return this.svc.getOne((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), invoiceId);
    }
    recordPayment(invoiceId, dto) {
        return this.svc.recordPayment(invoiceId, dto);
    }
    addReminder(invoiceId, dto) {
        return this.svc.addReminder(invoiceId, dto);
    }
    deleteReminder(invoiceId, reminderId, dto) {
        return this.svc.deleteReminder(invoiceId, reminderId, dto.portfolio_id, dto.user_id);
    }
};
exports.TenantInvoicesController = TenantInvoicesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __param(2, (0, common_1.Query)('unit_id')),
    __param(3, (0, common_1.Query)('year')),
    __param(4, (0, common_1.Query)('expense_category')),
    __param(5, (0, common_1.Query)('variance_tag')),
    __param(6, (0, common_1.Query)('invoice_kind')),
    __param(7, (0, common_1.Query)('reconciled')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], TenantInvoicesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':invoiceId'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TenantInvoicesController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(':invoiceId/payments'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_actions_dto_1.RecordPaymentDto]),
    __metadata("design:returntype", void 0)
], TenantInvoicesController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)(':invoiceId/reminders'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_actions_dto_1.CreateReminderDto]),
    __metadata("design:returntype", void 0)
], TenantInvoicesController.prototype, "addReminder", null);
__decorate([
    (0, common_1.Delete)(':invoiceId/reminders/:reminderId'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Param)('reminderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, invoice_actions_dto_1.DeleteReminderDto]),
    __metadata("design:returntype", void 0)
], TenantInvoicesController.prototype, "deleteReminder", null);
exports.TenantInvoicesController = TenantInvoicesController = __decorate([
    (0, common_1.Controller)('cam/invoices'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [tenant_invoices_service_1.TenantInvoicesService])
], TenantInvoicesController);
//# sourceMappingURL=tenant-invoices.controller.js.map