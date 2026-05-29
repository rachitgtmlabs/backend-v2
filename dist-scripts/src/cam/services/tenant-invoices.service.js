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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantInvoicesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const tenant_invoice_schema_1 = require("../schemas/tenant-invoice.schema");
const ids_1 = require("../utils/ids");
let TenantInvoicesService = class TenantInvoicesService {
    constructor(model) {
        this.model = model;
    }
    async list(filter) {
        const q = {
            portfolio_id: filter.portfolio_id,
        };
        if (filter.property_id)
            q.property_id = filter.property_id;
        if (filter.unit_id)
            q.unit_id = filter.unit_id;
        if (filter.calendar_year)
            q.calendar_year = filter.calendar_year;
        if (filter.expense_category)
            q.expense_category = filter.expense_category;
        if (filter.variance_tag)
            q.variance_tag = filter.variance_tag;
        if (filter.invoice_kind)
            q.invoice_kind = filter.invoice_kind;
        if (filter.reconciled === true) {
            q.status = 'committed';
            q.tenant_paid_amount = { $ne: null };
        }
        else if (filter.reconciled === false) {
            q.tenant_paid_amount = null;
        }
        let pipeline = this.model
            .find(q)
            .sort({ committed_at: -1, createdAt: -1 })
            .limit(filter.limit ?? 500);
        if (filter.vendor_name) {
            pipeline = pipeline;
        }
        const docs = await pipeline.lean();
        return docs.map(toPayload);
    }
    async getOne(portfolioId, invoiceId) {
        const doc = await this.model
            .findOne({ portfolio_id: portfolioId, invoiceId })
            .lean();
        if (!doc)
            throw new common_1.NotFoundException(`Invoice ${invoiceId} not found`);
        return toPayload(doc);
    }
    async recordPayment(invoiceId, dto, actorFromCtx) {
        const doc = await this.model.findOne({
            portfolio_id: dto.portfolio_id,
            invoiceId,
        });
        if (!doc)
            throw new common_1.NotFoundException(`Invoice ${invoiceId} not found`);
        if (doc.status === 'void') {
            throw new common_1.BadRequestException(`Cannot record payment against voided invoice`);
        }
        const actor = dto.actor ?? actorFromCtx ?? 'unknown';
        const now = new Date();
        doc.payment_history.push({
            amount: dto.amount,
            paid_at: new Date(dto.paid_at),
            method: dto.method ?? null,
            reference: dto.reference ?? null,
            notes: dto.notes ?? null,
            recorded_by: actor,
            recorded_at: now,
        });
        doc.tenant_paid_amount = dto.amount;
        doc.variance_tag = computeVarianceTag(doc.invoice_amount, dto.amount);
        await doc.save();
        return toPayload(doc.toObject());
    }
    async addReminder(invoiceId, dto) {
        const doc = await this.model.findOne({
            portfolio_id: dto.portfolio_id,
            invoiceId,
        });
        if (!doc)
            throw new common_1.NotFoundException(`Invoice ${invoiceId} not found`);
        doc.reminders.push({
            reminder_id: (0, ids_1.newReminderId)(),
            user_id: dto.user_id,
            remind_at: new Date(dto.remind_at),
            note: dto.note ?? '',
            channel: dto.channel ?? 'in_app',
            fired_at: null,
        });
        await doc.save();
        return toPayload(doc.toObject());
    }
    async deleteReminder(invoiceId, reminderId, portfolioId, userId) {
        const doc = await this.model.findOne({
            portfolio_id: portfolioId,
            invoiceId,
        });
        if (!doc)
            throw new common_1.NotFoundException(`Invoice ${invoiceId} not found`);
        const before = doc.reminders.length;
        doc.reminders = doc.reminders.filter((r) => !(r.reminder_id === reminderId && r.user_id === userId));
        if (doc.reminders.length === before) {
            throw new common_1.NotFoundException(`Reminder ${reminderId} not found for user`);
        }
        await doc.save();
        return { ok: true };
    }
    async findDueReminders(now = new Date(), limit = 200) {
        const docs = await this.model
            .find({
            'reminders.remind_at': { $lte: now },
            'reminders.fired_at': null,
        })
            .limit(limit)
            .lean();
        const out = [];
        for (const d of docs) {
            for (const r of d.reminders ?? []) {
                if (r.fired_at == null && r.remind_at <= now) {
                    out.push({
                        invoiceId: d.invoiceId,
                        unit_id: d.unit_id,
                        tenant_name: d.tenant_name,
                        reminder: {
                            reminder_id: r.reminder_id,
                            user_id: r.user_id,
                            remind_at: r.remind_at,
                            note: r.note ?? '',
                            channel: r.channel ?? 'in_app',
                        },
                    });
                }
            }
        }
        return out;
    }
    async markReminderFired(invoiceId, reminderId) {
        await this.model.updateOne({ invoiceId, 'reminders.reminder_id': reminderId }, { $set: { 'reminders.$.fired_at': new Date() } });
    }
};
exports.TenantInvoicesService = TenantInvoicesService;
exports.TenantInvoicesService = TenantInvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(tenant_invoice_schema_1.TenantInvoice.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], TenantInvoicesService);
function computeVarianceTag(invoiced, paid) {
    const EPSILON = 0.005;
    if (Math.abs(paid - invoiced) <= EPSILON)
        return 'compliant';
    if (paid > invoiced)
        return 'over_billed';
    return 'under_billed';
}
function toPayload(d) {
    return d;
}
//# sourceMappingURL=tenant-invoices.service.js.map