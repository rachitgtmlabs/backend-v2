"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseAnalysisModule = void 0;
const common_1 = require("@nestjs/common");
const property_module_1 = require("../property/property.module");
const groq_lease_analysis_service_1 = require("./groq-lease-analysis.service");
const lease_analysis_controller_1 = require("./lease-analysis.controller");
const lease_analysis_service_1 = require("./lease-analysis.service");
const ocr_extraction_bridge_service_1 = require("./ocr-extraction-bridge.service");
let LeaseAnalysisModule = class LeaseAnalysisModule {
};
exports.LeaseAnalysisModule = LeaseAnalysisModule;
exports.LeaseAnalysisModule = LeaseAnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [property_module_1.PropertyModule],
        controllers: [lease_analysis_controller_1.LeaseAnalysisController],
        providers: [
            ocr_extraction_bridge_service_1.OcrExtractionBridgeService,
            groq_lease_analysis_service_1.GroqLeaseAnalysisService,
            lease_analysis_service_1.LeaseAnalysisService,
        ],
    })
], LeaseAnalysisModule);
//# sourceMappingURL=lease-analysis.module.js.map