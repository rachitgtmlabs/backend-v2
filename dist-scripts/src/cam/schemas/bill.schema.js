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
exports.BillSchema = exports.Bill = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Bill = class Bill {
};
exports.Bill = Bill;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], Bill.prototype, "billId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], Bill.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], Bill.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Bill.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "vendor_invoice_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "vendor_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "vendor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "invoice_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "due_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "service_period_start", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "service_period_end", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "total_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, default: 'USD' }),
    __metadata("design:type", String)
], Bill.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "expense_category", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['extracted', 'incomplete', 'accepted', 'rejected', 'committed'],
        default: 'extracted',
        index: true,
    }),
    __metadata("design:type", String)
], Bill.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "source_file_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "source_page_range", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "ocr_confidence", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Bill.prototype, "missing_fields", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Bill.prototype, "additional_meta_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Bill.prototype, "session_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "accepted_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Bill.prototype, "accepted_at", void 0);
exports.Bill = Bill = __decorate([
    (0, mongoose_1.Schema)({ collection: 'bills', timestamps: true })
], Bill);
exports.BillSchema = mongoose_1.SchemaFactory.createForClass(Bill);
exports.BillSchema.index({ property_id: 1, status: 1, invoice_date: -1 });
exports.BillSchema.index({ portfolio_id: 1, status: 1, invoice_date: -1 });
exports.BillSchema.index({ session_id: 1, status: 1 });
exports.BillSchema.index({ property_id: 1, vendor_name: 1, vendor_invoice_number: 1, invoice_date: 1 }, { sparse: true, name: 'bill_dedup_idx' });
//# sourceMappingURL=bill.schema.js.map