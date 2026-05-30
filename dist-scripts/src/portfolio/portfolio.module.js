"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const amendment_schema_1 = require("../lease/schemas/amendment.schema");
const property_schema_1 = require("../property/schemas/property.schema");
const property_alert_schema_1 = require("../tasks-alerts/schemas/property-alert.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const unit_schema_1 = require("../unit/schemas/unit.schema");
const portfolio_controller_1 = require("./portfolio.controller");
const portfolio_service_1 = require("./portfolio.service");
const portfolio_schema_1 = require("./schemas/portfolio.schema");
let PortfolioModule = class PortfolioModule {
};
exports.PortfolioModule = PortfolioModule;
exports.PortfolioModule = PortfolioModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: portfolio_schema_1.Portfolio.name, schema: portfolio_schema_1.PortfolioSchema },
                { name: property_schema_1.Property.name, schema: property_schema_1.PropertySchema },
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
                { name: amendment_schema_1.Amendment.name, schema: amendment_schema_1.AmendmentSchema },
                { name: task_alert_schema_1.TaskAlert.name, schema: task_alert_schema_1.TaskAlertSchema },
                { name: property_alert_schema_1.PropertyAlert.name, schema: property_alert_schema_1.PropertyAlertSchema },
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
            ]),
        ],
        controllers: [portfolio_controller_1.PortfolioController],
        providers: [portfolio_service_1.PortfolioService],
        exports: [portfolio_service_1.PortfolioService],
    })
], PortfolioModule);
//# sourceMappingURL=portfolio.module.js.map