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
exports.ReconciliationRunSchema = exports.ReconciliationRun = exports.ReconUnitSnapshot = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ReconUnitSnapshot = class ReconUnitSnapshot {
};
exports.ReconUnitSnapshot = ReconUnitSnapshot;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReconUnitSnapshot.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ReconUnitSnapshot.prototype, "unit_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ReconUnitSnapshot.prototype, "tenant_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ReconUnitSnapshot.prototype, "actual_invoiced_total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ReconUnitSnapshot.prototype, "canonical_invoiced_total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ReconUnitSnapshot.prototype, "delta", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ReconUnitSnapshot.prototype, "actual_threshold_eoy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ReconUnitSnapshot.prototype, "canonical_threshold_eoy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ReconUnitSnapshot.prototype, "adjustment_invoiceId", void 0);
exports.ReconUnitSnapshot = ReconUnitSnapshot = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], ReconUnitSnapshot);
const ReconUnitSnapshotSchema = mongoose_1.SchemaFactory.createForClass(ReconUnitSnapshot);
let ReconciliationRun = class ReconciliationRun {
};
exports.ReconciliationRun = ReconciliationRun;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], ReconciliationRun.prototype, "runId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReconciliationRun.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReconciliationRun.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], ReconciliationRun.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Number)
], ReconciliationRun.prototype, "calendar_year", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['preview', 'applied'],
        default: 'preview',
        index: true,
    }),
    __metadata("design:type", String)
], ReconciliationRun.prototype, "mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReconciliationRun.prototype, "triggered_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], ReconciliationRun.prototype, "triggered_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], ReconciliationRun.prototype, "total_delta", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], ReconciliationRun.prototype, "units_with_discrepancies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], ReconciliationRun.prototype, "bills_affected", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [ReconUnitSnapshotSchema], default: [] }),
    __metadata("design:type", Array)
], ReconciliationRun.prototype, "by_unit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ReconciliationRun.prototype, "adjustments_created", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], ReconciliationRun.prototype, "applied_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ReconciliationRun.prototype, "applied_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ReconciliationRun.prototype, "apply_reason", void 0);
exports.ReconciliationRun = ReconciliationRun = __decorate([
    (0, mongoose_1.Schema)({ collection: 'reconciliation_runs', timestamps: true })
], ReconciliationRun);
exports.ReconciliationRunSchema = mongoose_1.SchemaFactory.createForClass(ReconciliationRun);
exports.ReconciliationRunSchema.index({ property_id: 1, calendar_year: 1, mode: 1, createdAt: -1 });
exports.ReconciliationRunSchema.index({ portfolio_id: 1, createdAt: -1 });
//# sourceMappingURL=reconciliation-run.schema.js.map