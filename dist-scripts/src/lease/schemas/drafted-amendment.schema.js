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
exports.DraftedAmendmentSchema = exports.DraftedAmendment = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let DraftedAmendment = class DraftedAmendment {
};
exports.DraftedAmendment = DraftedAmendment;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "riskTitle", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
    }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "riskSeverity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "originalClause", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "proposedClause", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "resolutionLabel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "resolutionValue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], DraftedAmendment.prototype, "reminderIso", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "markdown", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DraftedAmendment.prototype, "generatedAt", void 0);
exports.DraftedAmendment = DraftedAmendment = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], DraftedAmendment);
exports.DraftedAmendmentSchema = mongoose_1.SchemaFactory.createForClass(DraftedAmendment);
//# sourceMappingURL=drafted-amendment.schema.js.map