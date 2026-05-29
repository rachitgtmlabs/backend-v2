"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmendmentAnalysisModule = void 0;
const common_1 = require("@nestjs/common");
const property_module_1 = require("../property/property.module");
const amendment_analysis_controller_1 = require("./amendment-analysis.controller");
const amendment_analysis_service_1 = require("./amendment-analysis.service");
const groq_amendment_analysis_service_1 = require("./groq-amendment-analysis.service");
const ocr_extraction_bridge_service_1 = require("../lease-analysis/ocr-extraction-bridge.service");
let AmendmentAnalysisModule = class AmendmentAnalysisModule {
};
exports.AmendmentAnalysisModule = AmendmentAnalysisModule;
exports.AmendmentAnalysisModule = AmendmentAnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [property_module_1.PropertyModule],
        controllers: [amendment_analysis_controller_1.AmendmentAnalysisController],
        providers: [
            ocr_extraction_bridge_service_1.OcrExtractionBridgeService,
            groq_amendment_analysis_service_1.GroqAmendmentAnalysisService,
            amendment_analysis_service_1.AmendmentAnalysisService,
        ],
    })
], AmendmentAnalysisModule);
//# sourceMappingURL=amendment-analysis.module.js.map