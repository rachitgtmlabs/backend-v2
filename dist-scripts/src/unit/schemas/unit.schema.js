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
exports.UnitSchema = exports.Unit = exports.CamAllocation = exports.UNIT_TYPES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.UNIT_TYPES = [
    'retail',
    'office',
    'industrial',
    'residential',
    'mixed_use',
    'other',
];
let CamAllocation = class CamAllocation {
};
exports.CamAllocation = CamAllocation;
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], CamAllocation.prototype, "base_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], CamAllocation.prototype, "base_year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 0, max: 1 }),
    __metadata("design:type", Number)
], CamAllocation.prototype, "share_pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CamAllocation.prototype, "exclusions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], CamAllocation.prototype, "admin_fee_pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CamAllocation.prototype, "rule_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], CamAllocation.prototype, "rule_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['lease_abstraction', 'manual_override'],
        default: 'lease_abstraction',
    }),
    __metadata("design:type", String)
], CamAllocation.prototype, "source", void 0);
exports.CamAllocation = CamAllocation = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], CamAllocation);
const CamAllocationSchema = mongoose_1.SchemaFactory.createForClass(CamAllocation);
let Unit = class Unit {
};
exports.Unit = Unit;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], Unit.prototype, "unitId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Unit.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Unit.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Unit.prototype, "unit_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Unit.prototype, "unit_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['retail', 'office', 'industrial', 'residential', 'mixed_use', 'other'],
        default: null,
    }),
    __metadata("design:type", Object)
], Unit.prototype, "unit_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "floor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "building", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "premises", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "sqft_rentable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "sqft_usable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "parking_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'archived'], default: 'active' }),
    __metadata("design:type", String)
], Unit.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['occupied', 'vacant'],
        default: 'occupied',
        index: true,
    }),
    __metadata("design:type", String)
], Unit.prototype, "occupancy_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: CamAllocationSchema, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "cam_allocation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Unit.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Unit.prototype, "is_default_migrated", void 0);
exports.Unit = Unit = __decorate([
    (0, mongoose_1.Schema)({ collection: 'units', timestamps: true })
], Unit);
exports.UnitSchema = mongoose_1.SchemaFactory.createForClass(Unit);
exports.UnitSchema.index({ property_id: 1, status: 1, createdAt: 1 });
exports.UnitSchema.index({ portfolio_id: 1, property_id: 1 });
exports.UnitSchema.index({ property_id: 1, unit_code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
//# sourceMappingURL=unit.schema.js.map