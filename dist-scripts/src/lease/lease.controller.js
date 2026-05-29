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
exports.AmendmentController = exports.LeaseController = void 0;
const common_1 = require("@nestjs/common");
const portfolio_access_guard_1 = require("../auth/guards/portfolio-access.guard");
const create_lease_dto_1 = require("./dto/create-lease.dto");
const lease_service_1 = require("./lease.service");
let LeaseController = class LeaseController {
    constructor(leaseService) {
        this.leaseService = leaseService;
    }
    async getLatestForProperty(propertyId, portfolioId, res) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        res.set('Deprecation', 'true');
        return this.leaseService.getLatestForPortfolioProperty(pid, propertyId.trim());
    }
    getLatestForUnit(unitId, portfolioId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        return this.leaseService.getLatestForPortfolioUnit(pid, unitId.trim());
    }
    async getDocument(objectPath, res) {
        const path = objectPath?.trim();
        if (!path) {
            throw new common_1.BadRequestException('Query parameter path is required');
        }
        if (!path.startsWith('documents/')) {
            throw new common_1.BadRequestException('Invalid document path');
        }
        const result = await this.leaseService.downloadDocument(path);
        if (!result) {
            throw new common_1.NotFoundException('Document not found');
        }
        res.set({
            'Content-Type': result.contentType,
            'Content-Disposition': 'inline',
        });
        return new common_1.StreamableFile(result.buffer);
    }
    listDocumentsForProperty(propertyId, portfolioId, res) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        res.set('Deprecation', 'true');
        return this.leaseService.listDocumentsForPortfolioProperty(pid, propertyId.trim());
    }
    listDocumentsForUnit(unitId, portfolioId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        return this.leaseService.listDocumentsForPortfolioUnit(pid, unitId.trim());
    }
    getEffectiveState(leaseId) {
        return this.leaseService.getEffectiveState(leaseId.trim());
    }
    getEffectiveStateByProperty(propertyId, portfolioId, res) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        res.set('Deprecation', 'true');
        return this.leaseService.getEffectiveStateByProperty(pid, propertyId.trim());
    }
    getEffectiveStateByUnit(unitId, portfolioId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        return this.leaseService.getEffectiveStateByUnit(pid, unitId.trim());
    }
    listAmendments(leaseId) {
        return this.leaseService.listAmendments(leaseId.trim());
    }
    getFieldHistory(leaseId) {
        return this.leaseService.getFieldHistory(leaseId.trim());
    }
    create(body, req) {
        const user = req
            .user;
        const userEmail = typeof user?.email === 'string' && user.email.trim().length > 0
            ? user.email.trim()
            : null;
        return this.leaseService.create(body, { userEmail });
    }
};
exports.LeaseController = LeaseController;
__decorate([
    (0, common_1.Get)('by-property/:propertyId/latest'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LeaseController.prototype, "getLatestForProperty", null);
__decorate([
    (0, common_1.Get)('by-unit/:unitId/latest'),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "getLatestForUnit", null);
__decorate([
    (0, common_1.Get)('document'),
    __param(0, (0, common_1.Query)('path')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaseController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Get)('by-property/:propertyId/documents'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "listDocumentsForProperty", null);
__decorate([
    (0, common_1.Get)('by-unit/:unitId/documents'),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "listDocumentsForUnit", null);
__decorate([
    (0, common_1.Get)(':leaseId/effective-state'),
    __param(0, (0, common_1.Param)('leaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "getEffectiveState", null);
__decorate([
    (0, common_1.Get)('by-property/:propertyId/effective-state'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "getEffectiveStateByProperty", null);
__decorate([
    (0, common_1.Get)('by-unit/:unitId/effective-state'),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "getEffectiveStateByUnit", null);
__decorate([
    (0, common_1.Get)(':leaseId/amendments'),
    __param(0, (0, common_1.Param)('leaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "listAmendments", null);
__decorate([
    (0, common_1.Get)(':leaseId/field-history'),
    __param(0, (0, common_1.Param)('leaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "getFieldHistory", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lease_dto_1.CreateLeaseDto, Object]),
    __metadata("design:returntype", void 0)
], LeaseController.prototype, "create", null);
exports.LeaseController = LeaseController = __decorate([
    (0, common_1.Controller)('leases'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [lease_service_1.LeaseService])
], LeaseController);
let AmendmentController = class AmendmentController {
    constructor(leaseService) {
        this.leaseService = leaseService;
    }
    getAmendment(amendmentId) {
        return this.leaseService.getAmendment(amendmentId.trim());
    }
};
exports.AmendmentController = AmendmentController;
__decorate([
    (0, common_1.Get)(':amendmentId'),
    __param(0, (0, common_1.Param)('amendmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AmendmentController.prototype, "getAmendment", null);
exports.AmendmentController = AmendmentController = __decorate([
    (0, common_1.Controller)('amendments'),
    __metadata("design:paramtypes", [lease_service_1.LeaseService])
], AmendmentController);
//# sourceMappingURL=lease.controller.js.map