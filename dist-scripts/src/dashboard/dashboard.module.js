"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const property_schema_1 = require("../property/schemas/property.schema");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const portfolio_schema_1 = require("../portfolio/schemas/portfolio.schema");
const portfolio_module_1 = require("../portfolio/portfolio.module");
const dashboard_controller_1 = require("./dashboard.controller");
const dashboard_service_1 = require("./dashboard.service");
let DashboardModule = class DashboardModule {
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: property_schema_1.Property.name, schema: property_schema_1.PropertySchema },
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
                { name: task_alert_schema_1.TaskAlert.name, schema: task_alert_schema_1.TaskAlertSchema },
                { name: portfolio_schema_1.Portfolio.name, schema: portfolio_schema_1.PortfolioSchema },
            ]),
            portfolio_module_1.PortfolioModule,
        ],
        controllers: [dashboard_controller_1.DashboardController],
        providers: [dashboard_service_1.DashboardService],
    })
], DashboardModule);
//# sourceMappingURL=dashboard.module.js.map