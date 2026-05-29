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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const portfolio_access_guard_1 = require("../auth/guards/portfolio-access.guard");
const create_property_form_dto_1 = require("./dto/create-property-form.dto");
const gcs_thumbnail_service_1 = require("./gcs-thumbnail.service");
const property_service_1 = require("./property.service");
const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_THUMBNAIL_MIME = /^image\/(png|jpe?g|webp|gif)$/i;
const thumbnailInterceptor = (0, platform_express_1.FileInterceptor)('thumbnail', {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: THUMBNAIL_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !ALLOWED_THUMBNAIL_MIME.test(file.mimetype)) {
            cb(new common_1.BadRequestException('Thumbnail must be a PNG, JPEG, WEBP, or GIF image'), false);
            return;
        }
        cb(null, true);
    },
});
const thumbnailValidationPipe = new common_1.ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: ALLOWED_THUMBNAIL_MIME })
    .addMaxSizeValidator({ maxSize: THUMBNAIL_MAX_BYTES })
    .build({ fileIsRequired: false });
let PropertyController = class PropertyController {
    constructor(propertyService, gcsThumbnail) {
        this.propertyService = propertyService;
        this.gcsThumbnail = gcsThumbnail;
    }
    listByPortfolio(portfolioId) {
        const id = portfolioId?.trim();
        if (!id) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        return this.propertyService.listByPortfolioId(id);
    }
    async getAsset(objectPath, res) {
        const result = await this.gcsThumbnail.downloadFile(objectPath);
        if (!result) {
            throw new common_1.NotFoundException('Asset not found');
        }
        res.set({
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        });
        res.send(result.buffer);
    }
    deletionImpact(propertyId, portfolioId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        return this.propertyService.getDeletionImpact(pid, propertyId.trim());
    }
    async remove(propertyId, portfolioId) {
        const pid = portfolioId?.trim();
        if (!pid) {
            throw new common_1.BadRequestException('Query parameter portfolio_id is required');
        }
        await this.propertyService.remove(pid, propertyId.trim());
    }
    create(body, thumbnail) {
        return this.propertyService.create(body, thumbnail);
    }
};
exports.PropertyController = PropertyController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "listByPortfolio", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('asset/:objectPath(*)'),
    __param(0, (0, common_1.Param)('objectPath')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropertyController.prototype, "getAsset", null);
__decorate([
    (0, common_1.Get)(':propertyId/deletion-impact'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "deletionImpact", null);
__decorate([
    (0, common_1.Delete)(':propertyId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Query)('portfolio_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropertyController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(thumbnailInterceptor),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)(thumbnailValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_form_dto_1.CreatePropertyFormDto, Object]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "create", null);
exports.PropertyController = PropertyController = __decorate([
    (0, common_1.Controller)('properties'),
    (0, common_1.UseGuards)(portfolio_access_guard_1.PortfolioAccessGuard),
    __metadata("design:paramtypes", [property_service_1.PropertyService,
        gcs_thumbnail_service_1.GcsThumbnailService])
], PropertyController);
//# sourceMappingURL=property.controller.js.map