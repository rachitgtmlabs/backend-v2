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
exports.TaskAlertSchema = exports.TaskAlert = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let TaskAlert = class TaskAlert {
};
exports.TaskAlert = TaskAlert;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], TaskAlert.prototype, "itemId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TaskAlert.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TaskAlert.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TaskAlert.prototype, "lease_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, index: true, default: null }),
    __metadata("design:type", Object)
], TaskAlert.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['alert', 'task'] }),
    __metadata("design:type", String)
], TaskAlert.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], TaskAlert.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], TaskAlert.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['critical', 'high', 'medium', 'low'],
    }),
    __metadata("design:type", String)
], TaskAlert.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: false }),
    __metadata("design:type", Number)
], TaskAlert.prototype, "sortOrder", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], TaskAlert.prototype, "is_resolved", void 0);
exports.TaskAlert = TaskAlert = __decorate([
    (0, mongoose_1.Schema)({ collection: 'property_task_alerts', timestamps: true })
], TaskAlert);
exports.TaskAlertSchema = mongoose_1.SchemaFactory.createForClass(TaskAlert);
exports.TaskAlertSchema.index({
    portfolio_id: 1,
    property_id: 1,
    lease_id: 1,
    category: 1,
});
exports.TaskAlertSchema.index({
    portfolio_id: 1,
    unit_id: 1,
    lease_id: 1,
    category: 1,
});
//# sourceMappingURL=task-alert.schema.js.map