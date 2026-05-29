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
exports.BillsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bill_dto_1 = require("../dto/bill.dto");
const bill_schema_1 = require("../schemas/bill.schema");
const ids_1 = require("../utils/ids");
let BillsService = class BillsService {
    constructor(model) {
        this.model = model;
    }
    async create(dto, actor) {
        const missing = this.computeMissingFields(dto);
        const initialStatus = dto.status
            ? dto.status
            : missing.length > 0
                ? 'incomplete'
                : 'extracted';
        const doc = await this.model.create({
            billId: (0, ids_1.newBillId)(),
            portfolio_id: dto.portfolio_id.trim(),
            property_id: dto.property_id.trim(),
            unit_id: dto.unit_id?.trim() || null,
            vendor_invoice_number: dto.vendor_invoice_number?.trim() || null,
            vendor_name: dto.vendor_name?.trim() || null,
            vendor_id: dto.vendor_id?.trim() || null,
            invoice_date: dto.invoice_date ? new Date(dto.invoice_date) : null,
            due_date: dto.due_date ? new Date(dto.due_date) : null,
            service_period_start: dto.service_period_start
                ? new Date(dto.service_period_start)
                : null,
            service_period_end: dto.service_period_end
                ? new Date(dto.service_period_end)
                : null,
            total_amount: dto.total_amount ?? null,
            currency: dto.currency ?? 'USD',
            expense_category: dto.expense_category ?? null,
            status: initialStatus,
            source_file_url: dto.source_file_url ?? null,
            source_page_range: dto.source_page_range ?? null,
            ocr_confidence: dto.ocr_confidence ?? null,
            missing_fields: missing,
            additional_meta_data: dto.additional_meta_data ?? {},
            session_id: dto.session_id ?? null,
            created_by: actor ?? null,
        });
        return toPayload(doc.toObject());
    }
    async list(filter) {
        const q = {
            portfolio_id: filter.portfolio_id,
        };
        if (filter.property_id)
            q.property_id = filter.property_id;
        if (filter.session_id)
            q.session_id = filter.session_id;
        if (filter.status) {
            q.status = Array.isArray(filter.status)
                ? { $in: filter.status }
                : filter.status;
        }
        if (filter.invoice_date_from || filter.invoice_date_to) {
            q.invoice_date = {};
            if (filter.invoice_date_from)
                q.invoice_date.$gte = new Date(filter.invoice_date_from);
            if (filter.invoice_date_to)
                q.invoice_date.$lte = new Date(filter.invoice_date_to);
        }
        const docs = await this.model
            .find(q)
            .sort({ invoice_date: -1, createdAt: -1 })
            .limit(500)
            .lean();
        return docs.map(toPayload);
    }
    async getOne(portfolioId, billId) {
        const doc = await this.model
            .findOne({ portfolio_id: portfolioId, billId })
            .lean();
        if (!doc)
            throw new common_1.NotFoundException(`Bill ${billId} not found`);
        return toPayload(doc);
    }
    async update(portfolioId, billId, dto) {
        const doc = await this.model.findOne({ portfolio_id: portfolioId, billId });
        if (!doc)
            throw new common_1.NotFoundException(`Bill ${billId} not found`);
        if (doc.status === 'committed' || doc.status === 'rejected') {
            throw new common_1.BadRequestException(`Cannot modify a bill with status=${doc.status}`);
        }
        if (dto.vendor_invoice_number !== undefined)
            doc.vendor_invoice_number = dto.vendor_invoice_number.trim() || null;
        if (dto.vendor_name !== undefined)
            doc.vendor_name = dto.vendor_name.trim() || null;
        if (dto.vendor_id !== undefined)
            doc.vendor_id = dto.vendor_id.trim() || null;
        if (dto.invoice_date !== undefined)
            doc.invoice_date = dto.invoice_date ? new Date(dto.invoice_date) : null;
        if (dto.due_date !== undefined)
            doc.due_date = dto.due_date ? new Date(dto.due_date) : null;
        if (dto.service_period_start !== undefined)
            doc.service_period_start = dto.service_period_start
                ? new Date(dto.service_period_start)
                : null;
        if (dto.service_period_end !== undefined)
            doc.service_period_end = dto.service_period_end
                ? new Date(dto.service_period_end)
                : null;
        if (dto.total_amount !== undefined)
            doc.total_amount = dto.total_amount;
        if (dto.currency !== undefined)
            doc.currency = dto.currency;
        if (dto.expense_category !== undefined)
            doc.expense_category = dto.expense_category ?? null;
        if (dto.unit_id !== undefined)
            doc.unit_id = dto.unit_id?.trim() || null;
        if (dto.additional_meta_data !== undefined)
            doc.additional_meta_data = dto.additional_meta_data;
        doc.missing_fields = this.computeMissingFields({
            vendor_name: doc.vendor_name ?? undefined,
            invoice_date: doc.invoice_date?.toISOString() ?? undefined,
            total_amount: doc.total_amount ?? undefined,
            expense_category: doc.expense_category ?? undefined,
        });
        if (doc.status === 'incomplete' && doc.missing_fields.length === 0) {
            doc.status = 'extracted';
        }
        else if (doc.status === 'extracted' && doc.missing_fields.length > 0) {
            doc.status = 'incomplete';
        }
        await doc.save();
        return toPayload(doc.toObject());
    }
    async transition(portfolioId, billId, dto) {
        const doc = await this.model.findOne({ portfolio_id: portfolioId, billId });
        if (!doc)
            throw new common_1.NotFoundException(`Bill ${billId} not found`);
        if (doc.status === 'committed' || doc.status === 'rejected') {
            throw new common_1.BadRequestException(`Bill already ${doc.status}; cannot transition again`);
        }
        if (dto.to === 'accepted') {
            if (doc.missing_fields.length > 0) {
                throw new common_1.BadRequestException(`Bill has missing fields: ${doc.missing_fields.join(', ')}`);
            }
            doc.status = 'accepted';
            doc.accepted_by = dto.actor ?? null;
            doc.accepted_at = new Date();
        }
        else {
            doc.status = 'rejected';
        }
        await doc.save();
        return toPayload(doc.toObject());
    }
    async markCommitted(portfolioId, billIds) {
        if (billIds.length === 0)
            return 0;
        const res = await this.model.updateMany({
            portfolio_id: portfolioId,
            billId: { $in: [...billIds] },
            status: 'accepted',
        }, { $set: { status: 'committed' } });
        return res.modifiedCount ?? 0;
    }
    newSession() {
        return (0, ids_1.newSessionId)();
    }
    computeMissingFields(dto) {
        const out = [];
        for (const f of bill_dto_1.COMPULSORY_BILL_FIELDS) {
            const v = dto[f];
            if (v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
                out.push(f);
            }
        }
        return out;
    }
};
exports.BillsService = BillsService;
exports.BillsService = BillsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bill_schema_1.Bill.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BillsService);
function toPayload(doc) {
    return {
        billId: doc.billId,
        portfolio_id: doc.portfolio_id,
        property_id: doc.property_id,
        unit_id: doc.unit_id,
        vendor_invoice_number: doc.vendor_invoice_number,
        vendor_name: doc.vendor_name,
        vendor_id: doc.vendor_id,
        invoice_date: doc.invoice_date,
        due_date: doc.due_date,
        service_period_start: doc.service_period_start,
        service_period_end: doc.service_period_end,
        total_amount: doc.total_amount,
        currency: doc.currency,
        expense_category: doc.expense_category,
        status: doc.status,
        source_file_url: doc.source_file_url,
        source_page_range: doc.source_page_range,
        ocr_confidence: doc.ocr_confidence,
        missing_fields: doc.missing_fields,
        additional_meta_data: doc.additional_meta_data,
        session_id: doc.session_id,
        created_by: doc.created_by,
        accepted_by: doc.accepted_by,
        accepted_at: doc.accepted_at,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
//# sourceMappingURL=bills.service.js.map