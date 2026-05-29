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
exports.BillsController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const bill_dto_1 = require("../dto/bill.dto");
const bills_service_1 = require("../services/bills.service");
const require_query_1 = require("../utils/require-query");
let BillsController = class BillsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto) {
        return this.svc.create(dto);
    }
    list(portfolioId, propertyId, status, sessionId, from, to) {
        return this.svc.list({
            portfolio_id: (0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'),
            property_id: propertyId?.trim() || undefined,
            status: status
                ? status.split(',').map((s) => s.trim())
                : undefined,
            session_id: sessionId?.trim() || undefined,
            invoice_date_from: from,
            invoice_date_to: to,
        });
    }
    newSession() {
        return { session_id: this.svc.newSession() };
    }
    getOne(billId, portfolioId) {
        return this.svc.getOne((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), billId);
    }
    update(billId, portfolioId, dto) {
        return this.svc.update((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), billId, dto);
    }
    transition(billId, portfolioId, dto) {
        return this.svc.transition((0, require_query_1.requireQuery)(portfolioId, 'portfolio_id'), billId, dto);
    }
};
exports.BillsController = BillsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bill_dto_1.CreateBillDto]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __param(1, (0, common_1.Query)('property_id')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('session_id')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('session'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "newSession", null);
__decorate([
    (0, common_1.Get)(':billId'),
    __param(0, (0, common_1.Param)('billId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':billId'),
    __param(0, (0, common_1.Param)('billId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, bill_dto_1.UpdateBillDto]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':billId/transition'),
    __param(0, (0, common_1.Param)('billId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, bill_dto_1.TransitionBillDto]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "transition", null);
exports.BillsController = BillsController = __decorate([
    (0, common_1.Controller)('cam/bills'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [bills_service_1.BillsService])
], BillsController);
//# sourceMappingURL=bills.controller.js.map