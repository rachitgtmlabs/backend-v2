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
exports.DraftedAmendmentDto = void 0;
const class_validator_1 = require("class-validator");
class DraftedAmendmentDto {
}
exports.DraftedAmendmentDto = DraftedAmendmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "riskTitle", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['critical', 'high', 'medium', 'low']),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "riskSeverity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "originalClause", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "proposedClause", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "resolutionLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "resolutionValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], DraftedAmendmentDto.prototype, "reminderIso", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "markdown", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DraftedAmendmentDto.prototype, "generatedAt", void 0);
//# sourceMappingURL=drafted-amendment.dto.js.map