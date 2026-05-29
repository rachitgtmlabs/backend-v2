"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const schedule_1 = require("@nestjs/schedule");
const mongo_indexes_service_1 = require("./database/mongo-indexes.service");
const amendment_analysis_module_1 = require("./amendment-analysis/amendment-analysis.module");
const cam_module_1 = require("./cam/cam.module");
const lease_analysis_module_1 = require("./lease-analysis/lease-analysis.module");
const lease_module_1 = require("./lease/lease.module");
const portfolio_module_1 = require("./portfolio/portfolio.module");
const property_module_1 = require("./property/property.module");
const tasks_alerts_module_1 = require("./tasks-alerts/tasks-alerts.module");
const unit_module_1 = require("./unit/unit.module");
const chat_module_1 = require("./chat/chat.module");
const google_calendar_module_1 = require("./google-calendar/google-calendar.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const organizations_module_1 = require("./organizations/organizations.module");
const briefing_module_1 = require("./briefing/briefing.module");
const exec_briefing_module_1 = require("./exec-briefing/exec-briefing.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/lease_iq',
                }),
            }),
            portfolio_module_1.PortfolioModule,
            property_module_1.PropertyModule,
            unit_module_1.UnitModule,
            lease_module_1.LeaseModule,
            lease_analysis_module_1.LeaseAnalysisModule,
            amendment_analysis_module_1.AmendmentAnalysisModule,
            cam_module_1.CamModule,
            tasks_alerts_module_1.TasksAlertsModule,
            chat_module_1.ChatModule,
            google_calendar_module_1.GoogleCalendarModule,
            dashboard_module_1.DashboardModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            organizations_module_1.OrganizationsModule,
            briefing_module_1.BriefingModule,
            exec_briefing_module_1.ExecBriefingModule,
        ],
        providers: [mongo_indexes_service_1.MongoIndexesService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map