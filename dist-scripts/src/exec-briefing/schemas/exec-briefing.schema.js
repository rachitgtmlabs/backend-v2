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
exports.ExecBriefingSchema = exports.ExecBriefing = exports.ExecBriefingItem = exports.ExecBriefingStats = void 0;
const mongoose_1 = require("@nestjs/mongoose");
class ExecBriefingStats {
}
exports.ExecBriefingStats = ExecBriefingStats;
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "camBilledYtdUsd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "camStillRecoverableUsd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "outstandingFromTenantsUsd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "decisionsNeedingInputCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], ExecBriefingStats.prototype, "occupancyPct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "expiringNext12MonthsCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "expiringAnnualRentAtStakeUsd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "tenantConcentrationPct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], ExecBriefingStats.prototype, "tenantConcentrationTopN", void 0);
class ExecBriefingItem {
}
exports.ExecBriefingItem = ExecBriefingItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExecBriefingItem.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ExecBriefingItem.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['positive', 'concern', 'critical'],
        default: 'concern',
    }),
    __metadata("design:type", String)
], ExecBriefingItem.prototype, "tone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], ExecBriefingItem.prototype, "amountUsd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ExecBriefingItem.prototype, "suggestedAction", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ExecBriefingItem.prototype, "propertyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ExecBriefingItem.prototype, "leaseId", void 0);
let ExecBriefing = class ExecBriefing {
};
exports.ExecBriefing = ExecBriefing;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "briefingId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "orgId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "briefingWeekStart", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], ExecBriefing.prototype, "generatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: ExecBriefingStats, required: true }),
    __metadata("design:type", ExecBriefingStats)
], ExecBriefing.prototype, "stats", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "headline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "summary", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [ExecBriefingItem], default: [] }),
    __metadata("design:type", Array)
], ExecBriefing.prototype, "whatsWorking", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [ExecBriefingItem], default: [] }),
    __metadata("design:type", Array)
], ExecBriefing.prototype, "zoomIn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ExecBriefing.prototype, "questions", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['generating', 'ready', 'failed'],
        default: 'ready',
    }),
    __metadata("design:type", String)
], ExecBriefing.prototype, "status", void 0);
exports.ExecBriefing = ExecBriefing = __decorate([
    (0, mongoose_1.Schema)({ collection: 'exec_briefings', timestamps: true })
], ExecBriefing);
exports.ExecBriefingSchema = mongoose_1.SchemaFactory.createForClass(ExecBriefing);
exports.ExecBriefingSchema.index({ orgId: 1, briefingWeekStart: 1 }, { unique: true });
exports.ExecBriefingSchema.index({ orgId: 1, generatedAt: -1 });
//# sourceMappingURL=exec-briefing.schema.js.map