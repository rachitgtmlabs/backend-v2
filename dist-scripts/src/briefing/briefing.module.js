"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriefingModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const dashboard_module_1 = require("../dashboard/dashboard.module");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const mail_module_1 = require("../mail/mail.module");
const organizations_module_1 = require("../organizations/organizations.module");
const portfolio_schema_1 = require("../portfolio/schemas/portfolio.schema");
const users_module_1 = require("../users/users.module");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const briefing_controller_1 = require("./briefing.controller");
const briefing_scheduler_1 = require("./briefing.scheduler");
const briefing_service_1 = require("./briefing.service");
const daily_briefing_schema_1 = require("./schemas/daily-briefing.schema");
let BriefingModule = class BriefingModule {
};
exports.BriefingModule = BriefingModule;
exports.BriefingModule = BriefingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: daily_briefing_schema_1.DailyBriefing.name, schema: daily_briefing_schema_1.DailyBriefingSchema },
                { name: portfolio_schema_1.Portfolio.name, schema: portfolio_schema_1.PortfolioSchema },
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
                { name: task_alert_schema_1.TaskAlert.name, schema: task_alert_schema_1.TaskAlertSchema },
            ]),
            dashboard_module_1.DashboardModule,
            organizations_module_1.OrganizationsModule,
            users_module_1.UsersModule,
            mail_module_1.MailModule,
        ],
        controllers: [briefing_controller_1.BriefingController],
        providers: [briefing_service_1.BriefingService, briefing_scheduler_1.BriefingScheduler],
        exports: [briefing_service_1.BriefingService],
    })
], BriefingModule);
//# sourceMappingURL=briefing.module.js.map