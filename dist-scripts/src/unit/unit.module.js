"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const lease_schema_1 = require("../lease/schemas/lease.schema");
const portfolio_module_1 = require("../portfolio/portfolio.module");
const property_module_1 = require("../property/property.module");
const unit_schema_1 = require("./schemas/unit.schema");
const unit_controller_1 = require("./unit.controller");
const unit_service_1 = require("./unit.service");
let UnitModule = class UnitModule {
};
exports.UnitModule = UnitModule;
exports.UnitModule = UnitModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
                { name: lease_schema_1.Lease.name, schema: lease_schema_1.LeaseSchema },
            ]),
            portfolio_module_1.PortfolioModule,
            property_module_1.PropertyModule,
        ],
        controllers: [unit_controller_1.UnitController],
        providers: [unit_service_1.UnitService],
        exports: [unit_service_1.UnitService, mongoose_1.MongooseModule],
    })
], UnitModule);
//# sourceMappingURL=unit.module.js.map