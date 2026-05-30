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
exports.CreateLeaseDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const drafted_amendment_dto_1 = require("./drafted-amendment.dto");
class CreateLeaseDto {
}
exports.CreateLeaseDto = CreateLeaseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "portfolio_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "property_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "unit_id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['draft', 'processed']),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['main lease', 'amendment']),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "document_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "file_name", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateLeaseDto.prototype, "lease_information", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateLeaseDto.prototype, "analysis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "gcs_document_path", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => drafted_amendment_dto_1.DraftedAmendmentDto),
    __metadata("design:type", Array)
], CreateLeaseDto.prototype, "drafted_amendments", void 0);
//# sourceMappingURL=create-lease.dto.js.map