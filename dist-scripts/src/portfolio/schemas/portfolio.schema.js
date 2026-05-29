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
exports.PortfolioSchema = exports.Portfolio = exports.Attributes = exports.DocumentRequirement = exports.Stakeholder = exports.Locale = exports.Classification = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Classification = class Classification {
};
exports.Classification = Classification;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Classification.prototype, "property_type", void 0);
exports.Classification = Classification = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Classification);
const ClassificationSchema = mongoose_1.SchemaFactory.createForClass(Classification);
let Locale = class Locale {
};
exports.Locale = Locale;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Locale.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Locale.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Locale.prototype, "measurement_system", void 0);
exports.Locale = Locale = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Locale);
const LocaleSchema = mongoose_1.SchemaFactory.createForClass(Locale);
let Stakeholder = class Stakeholder {
};
exports.Stakeholder = Stakeholder;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Stakeholder.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Stakeholder.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Stakeholder.prototype, "role", void 0);
exports.Stakeholder = Stakeholder = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Stakeholder);
const StakeholderSchema = mongoose_1.SchemaFactory.createForClass(Stakeholder);
let DocumentRequirement = class DocumentRequirement {
};
exports.DocumentRequirement = DocumentRequirement;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRequirement.prototype, "docRequirementId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRequirement.prototype, "document_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRequirement.prototype, "requirement_level", void 0);
exports.DocumentRequirement = DocumentRequirement = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], DocumentRequirement);
const DocumentRequirementSchema = mongoose_1.SchemaFactory.createForClass(DocumentRequirement);
let Attributes = class Attributes {
};
exports.Attributes = Attributes;
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Attributes.prototype, "custom_fields", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'ui' }),
    __metadata("design:type", String)
], Attributes.prototype, "source", void 0);
exports.Attributes = Attributes = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Attributes);
const AttributesSchema = mongoose_1.SchemaFactory.createForClass(Attributes);
let Portfolio = class Portfolio {
};
exports.Portfolio = Portfolio;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], Portfolio.prototype, "portfolioId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Portfolio.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Portfolio.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: ClassificationSchema, required: true }),
    __metadata("design:type", Classification)
], Portfolio.prototype, "classification", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: LocaleSchema, required: true }),
    __metadata("design:type", Locale)
], Portfolio.prototype, "locale", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [StakeholderSchema], default: [] }),
    __metadata("design:type", Array)
], Portfolio.prototype, "stakeholders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [DocumentRequirementSchema], default: [] }),
    __metadata("design:type", Array)
], Portfolio.prototype, "document_requirements", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Portfolio.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: AttributesSchema,
        default: () => ({ custom_fields: {}, source: 'ui' }),
    }),
    __metadata("design:type", Attributes)
], Portfolio.prototype, "attributes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active' }),
    __metadata("design:type", String)
], Portfolio.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'user_admin' }),
    __metadata("design:type", String)
], Portfolio.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Portfolio.prototype, "organization_id", void 0);
exports.Portfolio = Portfolio = __decorate([
    (0, mongoose_1.Schema)({ collection: 'portfolios', timestamps: true })
], Portfolio);
exports.PortfolioSchema = mongoose_1.SchemaFactory.createForClass(Portfolio);
exports.PortfolioSchema.index({ organization_id: 1, createdAt: -1 });
//# sourceMappingURL=portfolio.schema.js.map