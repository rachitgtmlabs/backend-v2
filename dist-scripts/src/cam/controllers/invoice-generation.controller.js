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
exports.InvoiceGenerationController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../../auth/guards/portfolio-access.guard");
const generate_invoices_dto_1 = require("../dto/generate-invoices.dto");
const invoice_generation_service_1 = require("../services/invoice-generation.service");
let InvoiceGenerationController = class InvoiceGenerationController {
    constructor(svc) {
        this.svc = svc;
    }
    generate(dto) {
        return this.svc.preview({
            portfolio_id: dto.portfolio_id,
            property_id: dto.property_id,
            session_id: dto.session_id,
        });
    }
    commit(dto) {
        return this.svc.commit({
            portfolio_id: dto.portfolio_id,
            property_id: dto.property_id,
            session_id: dto.session_id,
            actor: dto.actor,
        });
    }
};
exports.InvoiceGenerationController = InvoiceGenerationController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_invoices_dto_1.GenerateInvoicesDto]),
    __metadata("design:returntype", void 0)
], InvoiceGenerationController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('commit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_invoices_dto_1.CommitInvoicesDto]),
    __metadata("design:returntype", void 0)
], InvoiceGenerationController.prototype, "commit", null);
exports.InvoiceGenerationController = InvoiceGenerationController = __decorate([
    (0, common_1.Controller)('cam/invoices'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [invoice_generation_service_1.InvoiceGenerationService])
], InvoiceGenerationController);
//# sourceMappingURL=invoice-generation.controller.js.map