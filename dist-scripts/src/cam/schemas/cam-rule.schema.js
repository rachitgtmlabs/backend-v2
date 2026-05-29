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
exports.CamRuleSchema = exports.CamRule = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let CamRule = class CamRule {
};
exports.CamRule = CamRule;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], CamRule.prototype, "ruleId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CamRule.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CamRule.prototype, "rule_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CamRule.prototype, "rule_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], CamRule.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], CamRule.prototype, "base_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: () => new Date().getUTCFullYear() }),
    __metadata("design:type", Number)
], CamRule.prototype, "base_year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], CamRule.prototype, "share_pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], CamRule.prototype, "admin_fee_pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CamRule.prototype, "exclusions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], CamRule.prototype, "created_by", void 0);
exports.CamRule = CamRule = __decorate([
    (0, mongoose_1.Schema)({ collection: 'cam_rules', timestamps: true })
], CamRule);
exports.CamRuleSchema = mongoose_1.SchemaFactory.createForClass(CamRule);
exports.CamRuleSchema.index({ portfolio_id: 1, rule_code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
//# sourceMappingURL=cam-rule.schema.js.map