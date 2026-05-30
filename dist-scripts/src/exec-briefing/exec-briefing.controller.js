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
exports.ExecBriefingController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const organizations_service_1 = require("../organizations/organizations.service");
const exec_briefing_service_1 = require("./exec-briefing.service");
function toWire(doc) {
    return {
        briefingId: doc.briefingId,
        briefingWeekStart: doc.briefingWeekStart,
        timezone: doc.timezone,
        generatedAt: doc.generatedAt.toISOString(),
        stats: doc.stats,
        headline: doc.headline,
        summary: doc.summary,
        whatsWorking: doc.whatsWorking,
        zoomIn: doc.zoomIn,
        questions: doc.questions,
        status: doc.status,
    };
}
let ExecBriefingController = class ExecBriefingController {
    constructor(execBriefings, orgs) {
        this.execBriefings = execBriefings;
        this.orgs = orgs;
    }
    async latest(orgId) {
        if (!orgId)
            throw new common_1.BadRequestException('No organization on this account');
        const doc = await this.execBriefings.getLatestOrThrow(orgId);
        return toWire(doc);
    }
    async run(orgId) {
        if (!orgId)
            throw new common_1.BadRequestException('No organization on this account');
        const org = await this.orgs.findByOrgId(orgId);
        const timezone = org?.timezone || 'America/New_York';
        const doc = await this.execBriefings.generateForOrg(orgId, {
            timezone,
            now: new Date(),
            force: true,
        });
        return toWire(doc);
    }
};
exports.ExecBriefingController = ExecBriefingController;
__decorate([
    (0, common_1.Get)('latest'),
    __param(0, (0, current_user_decorator_1.CurrentOrgId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExecBriefingController.prototype, "latest", null);
__decorate([
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentOrgId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExecBriefingController.prototype, "run", null);
exports.ExecBriefingController = ExecBriefingController = __decorate([
    (0, common_1.Controller)('exec-briefings'),
    __metadata("design:paramtypes", [exec_briefing_service_1.ExecBriefingService,
        organizations_service_1.OrganizationsService])
], ExecBriefingController);
//# sourceMappingURL=exec-briefing.controller.js.map