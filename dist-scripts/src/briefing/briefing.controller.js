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
exports.BriefingController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const organizations_service_1 = require("../organizations/organizations.service");
const users_service_1 = require("../users/users.service");
const briefing_service_1 = require("./briefing.service");
const email_subscription_dto_1 = require("./dto/email-subscription.dto");
function toWire(doc) {
    return {
        briefingId: doc.briefingId,
        briefingDate: doc.briefingDate,
        timezone: doc.timezone,
        generatedAt: doc.generatedAt.toISOString(),
        stats: doc.stats,
        items: doc.items,
        narrative: doc.narrative,
        status: doc.status,
    };
}
let BriefingController = class BriefingController {
    constructor(briefings, orgs, users) {
        this.briefings = briefings;
        this.orgs = orgs;
        this.users = users;
    }
    async latest(orgId) {
        if (!orgId)
            throw new common_1.BadRequestException('No organization on this account');
        const doc = await this.briefings.getLatestOrThrow(orgId);
        return toWire(doc);
    }
    async run(orgId) {
        if (!orgId)
            throw new common_1.BadRequestException('No organization on this account');
        const org = await this.orgs.findByOrgId(orgId);
        const timezone = org?.timezone || 'America/New_York';
        const doc = await this.briefings.generateForOrg(orgId, {
            timezone,
            now: new Date(),
            force: true,
        });
        const emailed = await this.briefings.sendBriefingEmails(doc);
        return { ...toWire(doc), emailed };
    }
    async getSubscription(optIn) {
        return { enabled: optIn === true };
    }
    async setSubscription(userId, body) {
        if (!userId)
            throw new common_1.BadRequestException('Not authenticated');
        const enabled = await this.users.setBriefingEmailOptIn(userId, body.enabled);
        return { enabled };
    }
};
exports.BriefingController = BriefingController;
__decorate([
    (0, common_1.Get)('latest'),
    __param(0, (0, current_user_decorator_1.CurrentOrgId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BriefingController.prototype, "latest", null);
__decorate([
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentOrgId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BriefingController.prototype, "run", null);
__decorate([
    (0, common_1.Get)('email-subscription'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('briefingEmailOptIn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BriefingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.Put)('email-subscription'),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, email_subscription_dto_1.EmailSubscriptionDto]),
    __metadata("design:returntype", Promise)
], BriefingController.prototype, "setSubscription", null);
exports.BriefingController = BriefingController = __decorate([
    (0, common_1.Controller)('briefings'),
    __metadata("design:paramtypes", [briefing_service_1.BriefingService,
        organizations_service_1.OrganizationsService,
        users_service_1.UsersService])
], BriefingController);
//# sourceMappingURL=briefing.controller.js.map