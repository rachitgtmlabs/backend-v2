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
exports.DailyBriefingSchema = exports.DailyBriefing = exports.BriefingItem = exports.BriefingStats = void 0;
const mongoose_1 = require("@nestjs/mongoose");
class BriefingStats {
}
exports.BriefingStats = BriefingStats;
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BriefingStats.prototype, "leasesChecked", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BriefingStats.prototype, "unitsCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BriefingStats.prototype, "propertyCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BriefingStats.prototype, "expiringNext12Months", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BriefingStats.prototype, "needsAttentionCount", void 0);
class BriefingItem {
}
exports.BriefingItem = BriefingItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], BriefingItem.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], BriefingItem.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['critical', 'high', 'medium', 'low'] }),
    __metadata("design:type", String)
], BriefingItem.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], BriefingItem.prototype, "leaseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], BriefingItem.prototype, "propertyId", void 0);
let DailyBriefing = class DailyBriefing {
};
exports.DailyBriefing = DailyBriefing;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "briefingId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "orgId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "briefingDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], DailyBriefing.prototype, "generatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: BriefingStats, required: true }),
    __metadata("design:type", BriefingStats)
], DailyBriefing.prototype, "stats", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [BriefingItem], default: [] }),
    __metadata("design:type", Array)
], DailyBriefing.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "narrative", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['generating', 'ready', 'failed'], default: 'ready' }),
    __metadata("design:type", String)
], DailyBriefing.prototype, "status", void 0);
exports.DailyBriefing = DailyBriefing = __decorate([
    (0, mongoose_1.Schema)({ collection: 'daily_briefings', timestamps: true })
], DailyBriefing);
exports.DailyBriefingSchema = mongoose_1.SchemaFactory.createForClass(DailyBriefing);
exports.DailyBriefingSchema.index({ orgId: 1, briefingDate: 1 }, { unique: true });
exports.DailyBriefingSchema.index({ orgId: 1, generatedAt: -1 });
//# sourceMappingURL=daily-briefing.schema.js.map