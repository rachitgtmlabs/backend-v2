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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePortfolioDto = exports.PortfolioPayloadDto = exports.AttributesDto = exports.DocumentRequirementDto = exports.StakeholderDto = exports.LocaleDto = exports.ClassificationDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ClassificationDto {
}
exports.ClassificationDto = ClassificationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ClassificationDto.prototype, "property_type", void 0);
class LocaleDto {
}
exports.LocaleDto = LocaleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocaleDto.prototype, "timezone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocaleDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocaleDto.prototype, "measurement_system", void 0);
class StakeholderDto {
}
exports.StakeholderDto = StakeholderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StakeholderDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StakeholderDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StakeholderDto.prototype, "role", void 0);
class DocumentRequirementDto {
}
exports.DocumentRequirementDto = DocumentRequirementDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentRequirementDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentRequirementDto.prototype, "document_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentRequirementDto.prototype, "requirement_level", void 0);
class AttributesDto {
}
exports.AttributesDto = AttributesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AttributesDto.prototype, "custom_fields", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttributesDto.prototype, "source", void 0);
class PortfolioPayloadDto {
}
exports.PortfolioPayloadDto = PortfolioPayloadDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PortfolioPayloadDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PortfolioPayloadDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ClassificationDto),
    __metadata("design:type", ClassificationDto)
], PortfolioPayloadDto.prototype, "classification", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocaleDto),
    __metadata("design:type", LocaleDto)
], PortfolioPayloadDto.prototype, "locale", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => StakeholderDto),
    __metadata("design:type", Array)
], PortfolioPayloadDto.prototype, "stakeholders", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DocumentRequirementDto),
    __metadata("design:type", Array)
], PortfolioPayloadDto.prototype, "document_requirements", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PortfolioPayloadDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AttributesDto),
    __metadata("design:type", AttributesDto)
], PortfolioPayloadDto.prototype, "attributes", void 0);
class CreatePortfolioDto {
}
exports.CreatePortfolioDto = CreatePortfolioDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PortfolioPayloadDto),
    __metadata("design:type", PortfolioPayloadDto)
], CreatePortfolioDto.prototype, "portfolio", void 0);
//# sourceMappingURL=create-portfolio.dto.js.map