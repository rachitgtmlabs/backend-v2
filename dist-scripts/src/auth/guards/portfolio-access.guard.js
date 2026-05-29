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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const portfolio_service_1 = require("../../portfolio/portfolio.service");
let PortfolioAccessGuard = class PortfolioAccessGuard {
    constructor(portfolioService) {
        this.portfolioService = portfolioService;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const orgId = user?.organization_id;
        const portfolioId = readId(req.query?.portfolio_id) ??
            readId(req.body?.portfolio_id) ??
            readId(req.body?.portfolio?.id) ??
            readId(req.params?.id);
        if (!portfolioId) {
            return true;
        }
        const allowed = await this.portfolioService.canUserAccess(portfolioId, orgId);
        if (!allowed) {
            throw new common_1.ForbiddenException('Portfolio not accessible by current user');
        }
        return true;
    }
};
exports.PortfolioAccessGuard = PortfolioAccessGuard;
exports.PortfolioAccessGuard = PortfolioAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [portfolio_service_1.PortfolioService])
], PortfolioAccessGuard);
function readId(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
//# sourceMappingURL=portfolio-access.guard.js.map