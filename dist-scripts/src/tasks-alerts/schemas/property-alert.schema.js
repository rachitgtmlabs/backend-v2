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
exports.PropertyAlertSchema = exports.PropertyAlert = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let PropertyAlert = class PropertyAlert {
};
exports.PropertyAlert = PropertyAlert;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "itemId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "lease_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, index: true, default: null }),
    __metadata("design:type", Object)
], PropertyAlert.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
    }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: false }),
    __metadata("design:type", Number)
], PropertyAlert.prototype, "sortOrder", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], PropertyAlert.prototype, "is_resolved", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "alert_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "due_timeline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], PropertyAlert.prototype, "suggested_action", void 0);
exports.PropertyAlert = PropertyAlert = __decorate([
    (0, mongoose_1.Schema)({ collection: 'property_alerts', timestamps: true })
], PropertyAlert);
exports.PropertyAlertSchema = mongoose_1.SchemaFactory.createForClass(PropertyAlert);
exports.PropertyAlertSchema.index({
    portfolio_id: 1,
    property_id: 1,
    lease_id: 1,
});
exports.PropertyAlertSchema.index({
    portfolio_id: 1,
    unit_id: 1,
    lease_id: 1,
});
//# sourceMappingURL=property-alert.schema.js.map