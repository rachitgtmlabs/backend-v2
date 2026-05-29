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
exports.TenantInvoiceSchema = exports.TenantInvoice = exports.AdjustmentLineItem = exports.InvoiceReminder = exports.PaymentEntry = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let PaymentEntry = class PaymentEntry {
};
exports.PaymentEntry = PaymentEntry;
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], PaymentEntry.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], PaymentEntry.prototype, "paid_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], PaymentEntry.prototype, "method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], PaymentEntry.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], PaymentEntry.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], PaymentEntry.prototype, "recorded_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], PaymentEntry.prototype, "recorded_at", void 0);
exports.PaymentEntry = PaymentEntry = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PaymentEntry);
const PaymentEntrySchema = mongoose_1.SchemaFactory.createForClass(PaymentEntry);
let InvoiceReminder = class InvoiceReminder {
};
exports.InvoiceReminder = InvoiceReminder;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], InvoiceReminder.prototype, "reminder_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], InvoiceReminder.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], InvoiceReminder.prototype, "remind_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], InvoiceReminder.prototype, "note", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'in_app' }),
    __metadata("design:type", String)
], InvoiceReminder.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], InvoiceReminder.prototype, "fired_at", void 0);
exports.InvoiceReminder = InvoiceReminder = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], InvoiceReminder);
const InvoiceReminderSchema = mongoose_1.SchemaFactory.createForClass(InvoiceReminder);
let AdjustmentLineItem = class AdjustmentLineItem {
};
exports.AdjustmentLineItem = AdjustmentLineItem;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], AdjustmentLineItem.prototype, "billId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], AdjustmentLineItem.prototype, "bill_vendor_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], AdjustmentLineItem.prototype, "bill_invoice_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], AdjustmentLineItem.prototype, "bill_total_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], AdjustmentLineItem.prototype, "original_invoice_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], AdjustmentLineItem.prototype, "original_invoiced_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], AdjustmentLineItem.prototype, "canonical_invoiced_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], AdjustmentLineItem.prototype, "delta", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], AdjustmentLineItem.prototype, "reason", void 0);
exports.AdjustmentLineItem = AdjustmentLineItem = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], AdjustmentLineItem);
const AdjustmentLineItemSchema = mongoose_1.SchemaFactory.createForClass(AdjustmentLineItem);
let TenantInvoice = class TenantInvoice {
};
exports.TenantInvoice = TenantInvoice;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "invoiceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['original', 'adjustment'],
        default: 'original',
        index: true,
    }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "invoice_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "billId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "unit_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "tenant_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "bill_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "share_pct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "base_amount_at_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "base_year_at_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "admin_fee_pct_at_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "threshold_before", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "threshold_after", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], TenantInvoice.prototype, "under_base_portion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], TenantInvoice.prototype, "over_base_portion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], TenantInvoice.prototype, "admin_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], TenantInvoice.prototype, "invoice_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['excluded', 'pre_base', 'crossover', 'post_base'],
        default: null,
    }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "case_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, index: true }),
    __metadata("design:type", Number)
], TenantInvoice.prototype, "calendar_year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "expense_category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], TenantInvoice.prototype, "applied_cam_rule_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['draft', 'pending_review', 'committed', 'void'],
        default: 'draft',
        index: true,
    }),
    __metadata("design:type", String)
], TenantInvoice.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "committed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "committed_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: null }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "tenant_paid_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['compliant', 'over_billed', 'under_billed'],
        default: null,
        index: true,
    }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "variance_tag", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [PaymentEntrySchema], default: [] }),
    __metadata("design:type", Array)
], TenantInvoice.prototype, "payment_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [InvoiceReminderSchema], default: [] }),
    __metadata("design:type", Array)
], TenantInvoice.prototype, "reminders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], TenantInvoice.prototype, "reconciliation_runId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [AdjustmentLineItemSchema], default: undefined }),
    __metadata("design:type", Array)
], TenantInvoice.prototype, "line_items", void 0);
exports.TenantInvoice = TenantInvoice = __decorate([
    (0, mongoose_1.Schema)({ collection: 'tenant_invoices', timestamps: true })
], TenantInvoice);
exports.TenantInvoiceSchema = mongoose_1.SchemaFactory.createForClass(TenantInvoice);
exports.TenantInvoiceSchema.index({ property_id: 1, calendar_year: 1, status: 1 });
exports.TenantInvoiceSchema.index({ unit_id: 1, calendar_year: 1, createdAt: 1 });
exports.TenantInvoiceSchema.index({ portfolio_id: 1, status: 1, createdAt: -1 });
exports.TenantInvoiceSchema.index({ billId: 1, unit_id: 1 }, { sparse: true });
//# sourceMappingURL=tenant-invoice.schema.js.map