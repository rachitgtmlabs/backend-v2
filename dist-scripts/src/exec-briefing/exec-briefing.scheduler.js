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
var ExecBriefingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecBriefingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const organizations_service_1 = require("../organizations/organizations.service");
const exec_briefing_service_1 = require("./exec-briefing.service");
const TARGET_HOUR = 6;
const TARGET_DOW = 'Mon';
let ExecBriefingScheduler = ExecBriefingScheduler_1 = class ExecBriefingScheduler {
    constructor(orgs, execBriefings) {
        this.orgs = orgs;
        this.execBriefings = execBriefings;
        this.logger = new common_1.Logger(ExecBriefingScheduler_1.name);
    }
    async tick() {
        const now = new Date();
        const orgs = await this.orgs.listAll();
        let generated = 0;
        for (const org of orgs) {
            const timezone = org.timezone || 'America/New_York';
            if (!isMondaySixAM(timezone, now))
                continue;
            try {
                await this.execBriefings.generateForOrg(org.orgId, { timezone, now });
                generated += 1;
            }
            catch (err) {
                this.logger.error(`Exec briefing failed for org ${org.orgId}: ${err.message}`);
            }
        }
        if (generated > 0) {
            this.logger.log(`Generated ${generated} exec briefing(s)`);
        }
    }
};
exports.ExecBriefingScheduler = ExecBriefingScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR, { name: 'exec-briefing-weekly' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExecBriefingScheduler.prototype, "tick", null);
exports.ExecBriefingScheduler = ExecBriefingScheduler = ExecBriefingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService,
        exec_briefing_service_1.ExecBriefingService])
], ExecBriefingScheduler);
function isMondaySixAM(timezone, now) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        hour: '2-digit',
        weekday: 'short',
        hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '');
    void exec_briefing_service_1.orgLocalWeekStart;
    return weekday === TARGET_DOW && (hour % 24) === TARGET_HOUR;
}
//# sourceMappingURL=exec-briefing.scheduler.js.map