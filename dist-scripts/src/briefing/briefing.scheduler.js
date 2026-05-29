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
var BriefingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriefingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const organizations_service_1 = require("../organizations/organizations.service");
const briefing_service_1 = require("./briefing.service");
const TARGET_HOUR = 6;
let BriefingScheduler = BriefingScheduler_1 = class BriefingScheduler {
    constructor(orgs, briefings) {
        this.orgs = orgs;
        this.briefings = briefings;
        this.logger = new common_1.Logger(BriefingScheduler_1.name);
    }
    async tick() {
        const now = new Date();
        const orgs = await this.orgs.listAll();
        let generated = 0;
        for (const org of orgs) {
            const timezone = org.timezone || 'America/New_York';
            const { hour } = (0, briefing_service_1.orgLocalParts)(timezone, now);
            if (hour !== TARGET_HOUR)
                continue;
            try {
                const briefing = await this.briefings.generateForOrg(org.orgId, {
                    timezone,
                    now,
                });
                await this.briefings.sendBriefingEmails(briefing);
                generated += 1;
            }
            catch (err) {
                this.logger.error(`Daily briefing failed for org ${org.orgId}: ${err.message}`);
            }
        }
        if (generated > 0) {
            this.logger.log(`Generated ${generated} daily briefing(s)`);
        }
    }
};
exports.BriefingScheduler = BriefingScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR, { name: 'daily-briefing' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BriefingScheduler.prototype, "tick", null);
exports.BriefingScheduler = BriefingScheduler = BriefingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService,
        briefing_service_1.BriefingService])
], BriefingScheduler);
//# sourceMappingURL=briefing.scheduler.js.map