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
exports.ExpenseCategorySchema = exports.ExpenseCategory = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ExpenseCategory = class ExpenseCategory {
};
exports.ExpenseCategory = ExpenseCategory;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], ExpenseCategory.prototype, "categoryId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], ExpenseCategory.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ExpenseCategory.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], ExpenseCategory.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], ExpenseCategory.prototype, "recoverable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], ExpenseCategory.prototype, "is_system", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ExpenseCategory.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], ExpenseCategory.prototype, "created_by", void 0);
exports.ExpenseCategory = ExpenseCategory = __decorate([
    (0, mongoose_1.Schema)({ collection: 'expense_categories', timestamps: true })
], ExpenseCategory);
exports.ExpenseCategorySchema = mongoose_1.SchemaFactory.createForClass(ExpenseCategory);
exports.ExpenseCategorySchema.index({ portfolio_id: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
exports.ExpenseCategorySchema.index({ is_system: 1, name: 1 });
//# sourceMappingURL=expense-category.schema.js.map