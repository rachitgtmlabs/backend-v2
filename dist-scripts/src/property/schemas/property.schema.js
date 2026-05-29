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
exports.PropertySchema = exports.Property = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Property = class Property {
};
exports.Property = Property;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], Property.prototype, "propertyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Property.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Property.prototype, "property_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Property.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Property.prototype, "property_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Property.prototype, "thumbnail_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['single_unit', 'multi_unit'],
        default: 'single_unit',
        index: true,
    }),
    __metadata("design:type", String)
], Property.prototype, "property_kind", void 0);
exports.Property = Property = __decorate([
    (0, mongoose_1.Schema)({ collection: 'properties', timestamps: true })
], Property);
exports.PropertySchema = mongoose_1.SchemaFactory.createForClass(Property);
exports.PropertySchema.index({ portfolio_id: 1, createdAt: -1 });
exports.PropertySchema.index({ portfolioId: 1, createdAt: -1 }, { sparse: true });
//# sourceMappingURL=property.schema.js.map