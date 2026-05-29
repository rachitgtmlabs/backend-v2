"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const tasks_alerts_module_1 = require("../tasks-alerts/tasks-alerts.module");
const portfolio_module_1 = require("../portfolio/portfolio.module");
const property_module_1 = require("../property/property.module");
const unit_module_1 = require("../unit/unit.module");
const lease_controller_1 = require("./lease.controller");
const lease_service_1 = require("./lease.service");
const lease_schema_1 = require("./schemas/lease.schema");
const amendment_schema_1 = require("./schemas/amendment.schema");
let LeaseModule = class LeaseModule {
};
exports.LeaseModule = LeaseModule;
exports.LeaseModule = LeaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
                { name: amendment_schema_1.Amendment.name, schema: amendment_schema_1.AmendmentSchema },
            ]),
            portfolio_module_1.PortfolioModule,
            property_module_1.PropertyModule,
            unit_module_1.UnitModule,
            tasks_alerts_module_1.TasksAlertsModule,
        ],
        controllers: [lease_controller_1.LeaseController, lease_controller_1.AmendmentController],
        providers: [lease_service_1.LeaseService],
        exports: [lease_service_1.LeaseService],
    })
], LeaseModule);
//# sourceMappingURL=lease.module.js.map