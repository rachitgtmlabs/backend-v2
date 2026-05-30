"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecBriefingModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const dashboard_module_1 = require("../dashboard/dashboard.module");
const organizations_module_1 = require("../organizations/organizations.module");
const exec_briefing_controller_1 = require("./exec-briefing.controller");
const exec_briefing_scheduler_1 = require("./exec-briefing.scheduler");
const exec_briefing_service_1 = require("./exec-briefing.service");
const exec_briefing_schema_1 = require("./schemas/exec-briefing.schema");
let ExecBriefingModule = class ExecBriefingModule {
};
exports.ExecBriefingModule = ExecBriefingModule;
exports.ExecBriefingModule = ExecBriefingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: exec_briefing_schema_1.ExecBriefing.name, schema: exec_briefing_schema_1.ExecBriefingSchema },
            ]),
            dashboard_module_1.DashboardModule,
            organizations_module_1.OrganizationsModule,
        ],
        controllers: [exec_briefing_controller_1.ExecBriefingController],
        providers: [exec_briefing_service_1.ExecBriefingService, exec_briefing_scheduler_1.ExecBriefingScheduler],
        exports: [exec_briefing_service_1.ExecBriefingService],
    })
], ExecBriefingModule);
//# sourceMappingURL=exec-briefing.module.js.map