"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AmendmentAnalysisController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmendmentAnalysisController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const amendment_analysis_service_1 = require("./amendment-analysis.service");
let AmendmentAnalysisController = AmendmentAnalysisController_1 = class AmendmentAnalysisController {
    constructor(amendmentAnalysisService) {
        this.amendmentAnalysisService = amendmentAnalysisService;
        this.logger = new common_1.Logger(AmendmentAnalysisController_1.name);
    }
    async streamAmendmentAnalysis(file, body, res) {
        const bytes = file?.size ?? file?.buffer?.length ?? 0;
        this.logger.log(`amendment-analysis stream request bytes=${bytes} lease_id=${body.lease_id}`);
        if (!file?.buffer && !file?.path) {
            throw new common_1.BadRequestException('Multipart field "assets" with a file is required');
        }
        if (!body.lease_id) {
            throw new common_1.BadRequestException('lease_id is required');
        }
        let previousAnalysis = {};
        if (body.previous_analysis) {
            try {
                previousAnalysis = JSON.parse(body.previous_analysis);
            }
            catch (err) {
                throw new common_1.BadRequestException('previous_analysis must be valid JSON');
            }
        }
        await this.amendmentAnalysisService.streamNdjsonAmendmentAnalysis(file, previousAnalysis, res);
    }
};
exports.AmendmentAnalysisController = AmendmentAnalysisController;
__decorate([
    (0, common_1.Post)('stream'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('assets')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AmendmentAnalysisController.prototype, "streamAmendmentAnalysis", null);
exports.AmendmentAnalysisController = AmendmentAnalysisController = AmendmentAnalysisController_1 = __decorate([
    (0, common_1.Controller)('amendment-analysis'),
    __metadata("design:paramtypes", [amendment_analysis_service_1.AmendmentAnalysisService])
], AmendmentAnalysisController);
//# sourceMappingURL=amendment-analysis.controller.js.map