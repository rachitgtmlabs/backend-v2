"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const amendment_schema_1 = require("../lease/schemas/amendment.schema");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const portfolio_module_1 = require("../portfolio/portfolio.module");
const property_alert_schema_1 = require("../tasks-alerts/schemas/property-alert.schema");
const task_alert_schema_1 = require("../tasks-alerts/schemas/task-alert.schema");
const unit_schema_1 = require("../unit/schemas/unit.schema");
const gcs_thumbnail_service_1 = require("./gcs-thumbnail.service");
const property_controller_1 = require("./property.controller");
const property_service_1 = require("./property.service");
const property_schema_1 = require("./schemas/property.schema");
let PropertyModule = class PropertyModule {
};
exports.PropertyModule = PropertyModule;
exports.PropertyModule = PropertyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: property_schema_1.Property.name, schema: property_schema_1.PropertySchema },
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
                { name: amendment_schema_1.Amendment.name, schema: amendment_schema_1.AmendmentSchema },
                { name: task_alert_schema_1.TaskAlert.name, schema: task_alert_schema_1.TaskAlertSchema },
                { name: property_alert_schema_1.PropertyAlert.name, schema: property_alert_schema_1.PropertyAlertSchema },
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
            ]),
            portfolio_module_1.PortfolioModule,
        ],
        controllers: [property_controller_1.PropertyController],
        providers: [property_service_1.PropertyService, gcs_thumbnail_service_1.GcsThumbnailService],
        exports: [property_service_1.PropertyService, gcs_thumbnail_service_1.GcsThumbnailService],
    })
], PropertyModule);
//# sourceMappingURL=property.module.js.map