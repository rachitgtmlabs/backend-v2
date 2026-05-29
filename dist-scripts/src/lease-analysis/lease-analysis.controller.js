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
var LeaseAnalysisController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseAnalysisController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const draft_addendum_dto_1 = require("./dto/draft-addendum.dto");
const proposed_clause_dto_1 = require("./dto/proposed-clause.dto");
const lease_analysis_service_1 = require("./lease-analysis.service");
let LeaseAnalysisController = LeaseAnalysisController_1 = class LeaseAnalysisController {
    constructor(leaseAnalysisService) {
        this.leaseAnalysisService = leaseAnalysisService;
        this.logger = new common_1.Logger(LeaseAnalysisController_1.name);
    }
    proposeComplianceReplacement(body) {
        return this.leaseAnalysisService.proposeComplianceReplacement(body);
    }
    draftAddendum(body) {
        return this.leaseAnalysisService.draftAddendum(body);
    }
    async streamLeaseAnalysis(file, res) {
        const bytes = file?.size ?? file?.buffer?.length ?? 0;
        this.logger.log(`lease-analysis stream request bytes=${bytes}`);
        if (!file?.buffer && !file?.path) {
            throw new common_1.BadRequestException('Multipart field "assets" with a file is required');
        }
        await this.leaseAnalysisService.streamNdjsonLeaseAnalysis(file, res);
    }
};
exports.LeaseAnalysisController = LeaseAnalysisController;
__decorate([
    (0, common_1.Post)('proposed-clause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [proposed_clause_dto_1.ProposedClauseDto]),
    __metadata("design:returntype", void 0)
], LeaseAnalysisController.prototype, "proposeComplianceReplacement", null);
__decorate([
    (0, common_1.Post)('draft-addendum'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [draft_addendum_dto_1.DraftAddendumDto]),
    __metadata("design:returntype", void 0)
], LeaseAnalysisController.prototype, "draftAddendum", null);
__decorate([
    (0, common_1.Post)('stream'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('assets')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaseAnalysisController.prototype, "streamLeaseAnalysis", null);
exports.LeaseAnalysisController = LeaseAnalysisController = LeaseAnalysisController_1 = __decorate([
    (0, common_1.Controller)('lease-analysis'),
    __metadata("design:paramtypes", [lease_analysis_service_1.LeaseAnalysisService])
], LeaseAnalysisController);
//# sourceMappingURL=lease-analysis.controller.js.map