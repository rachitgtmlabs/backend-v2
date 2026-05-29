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
var InvoiceGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceGenerationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const lease_schema_1 = require("../../lease/schemas/lease.schema");
const unit_schema_1 = require("../../unit/schemas/unit.schema");
const engine_1 = require("../engine");
const bill_schema_1 = require("../schemas/bill.schema");
const tenant_invoice_schema_1 = require("../schemas/tenant-invoice.schema");
const unit_threshold_schema_1 = require("../schemas/unit-threshold.schema");
const ids_1 = require("../utils/ids");
let InvoiceGenerationService = InvoiceGenerationService_1 = class InvoiceGenerationService {
    constructor(billModel, unitModel, invoiceModel, thresholdModel, leaseModel) {
        this.billModel = billModel;
        this.unitModel = unitModel;
        this.invoiceModel = invoiceModel;
        this.thresholdModel = thresholdModel;
        this.leaseModel = leaseModel;
        this.logger = new common_1.Logger(InvoiceGenerationService_1.name);
        this.applyBillToUnitDebug = engine_1.applyBillToUnit;
    }
    async preview(args) {
        const { bills, units, thresholdsByKey } = await this.loadInputs(args);
        if (bills.length === 0) {
            throw new common_1.BadRequestException(`No accepted bills to preview for property=${args.property_id}` +
                (args.session_id ? ` session=${args.session_id}` : ''));
        }
        const result = (0, engine_1.generateInvoicesForBatch)(bills, units, {
            initial_thresholds: Object.fromEntries(thresholdsByKey),
        });
        return {
            invoices: result.invoices.map((i) => this.toPreviewInvoice(i, args.portfolio_id, args.property_id, units)),
            stats: result.stats,
            threshold_deltas: this.computeThresholdDeltas(thresholdsByKey, result.final_thresholds, result.invoices),
        };
    }
    async commit(args) {
        const { bills, units, thresholdsByKey } = await this.loadInputs(args);
        if (bills.length === 0) {
            return {
                invoices: [],
                bills_committed: 0,
                threshold_writes: 0,
                stats: {
                    bills_processed: 0,
                    bills_skipped: 0,
                    units_processed: 0,
                    invoices_produced: 0,
                    invoices_with_billable_gt_zero: 0,
                    invoices_excluded: 0,
                    invoices_crossover: 0,
                },
            };
        }
        const billIds = bills.map((b) => b.billId);
        const existingInvoices = await this.invoiceModel
            .find({
            billId: { $in: billIds },
            property_id: args.property_id,
            portfolio_id: args.portfolio_id,
            invoice_kind: 'original',
        })
            .lean();
        const existingKeys = new Set(existingInvoices.map((i) => `${String(i.billId)}::${String(i.unit_id)}::${i.calendar_year}`));
        const result = (0, engine_1.generateInvoicesForBatch)(bills, units, {
            initial_thresholds: Object.fromEntries(thresholdsByKey),
        });
        const newInvoices = result.invoices.filter((r) => !existingKeys.has(`${r.billId}::${r.unit_id}::${r.calendar_year}`));
        const now = new Date();
        const docs = newInvoices.map((r) => {
            const unit = units.find((u) => u.unit_id === r.unit_id);
            return {
                invoiceId: (0, ids_1.newInvoiceId)(),
                invoice_kind: 'original',
                billId: r.billId,
                unit_id: r.unit_id,
                property_id: args.property_id,
                portfolio_id: args.portfolio_id,
                unit_code: unit?.unit_code ?? null,
                tenant_name: unit?.tenant_name ?? null,
                bill_amount: r.bill_amount,
                share_pct: r.share_pct,
                base_amount_at_time: r.base_amount_at_time,
                base_year_at_time: r.base_year_at_time,
                admin_fee_pct_at_time: r.admin_fee_pct_at_time,
                threshold_before: r.threshold_before,
                threshold_after: r.threshold_after,
                under_base_portion: r.under_base_portion,
                over_base_portion: r.over_base_portion,
                admin_fee: r.admin_fee,
                invoice_amount: r.invoice_amount,
                case_type: r.case_type,
                calendar_year: r.calendar_year,
                expense_category: r.expense_category,
                applied_cam_rule_ids: r.applied_cam_rule_ids,
                status: 'committed',
                committed_at: now,
                committed_by: args.actor ?? null,
                tenant_paid_amount: null,
                variance_tag: null,
                payment_history: [],
                reminders: [],
            };
        });
        if (docs.length > 0) {
            await this.invoiceModel.insertMany(docs, { ordered: false });
        }
        const updatedKeys = new Set();
        let thresholdWrites = 0;
        for (const inv of result.invoices) {
            const key = `${inv.unit_id}-${inv.calendar_year}`;
            if (updatedKeys.has(key))
                continue;
            updatedKeys.add(key);
            const before = thresholdsByKey.get(key) ?? 0;
            const after = result.final_thresholds[key] ?? before;
            if (Math.abs(after - before) < 0.0005)
                continue;
            const billsForKey = result.invoices.filter((r) => r.unit_id === inv.unit_id &&
                r.calendar_year === inv.calendar_year &&
                !existingKeys.has(`${r.billId}::${inv.unit_id}::${inv.calendar_year}`));
            const lastBill = billsForKey[billsForKey.length - 1];
            await this.thresholdModel.findOneAndUpdate({ unit_id: inv.unit_id, calendar_year: inv.calendar_year }, {
                $setOnInsert: {
                    thresholdId: (0, ids_1.newThresholdId)(),
                    unit_id: inv.unit_id,
                    calendar_year: inv.calendar_year,
                    portfolio_id: args.portfolio_id,
                    property_id: args.property_id,
                },
                $set: {
                    threshold_amount: after,
                    last_bill_id: lastBill?.billId ?? null,
                },
                $inc: { bills_applied_count: billsForKey.length },
            }, { upsert: true, new: true });
            thresholdWrites += 1;
        }
        const committedBillIds = Array.from(new Set(newInvoices.map((r) => r.billId)));
        const billsCommitted = await this.markBillsCommitted(args.portfolio_id, committedBillIds);
        const persistedInvoices = docs.map(toInvoicePayload);
        return {
            invoices: persistedInvoices,
            bills_committed: billsCommitted,
            threshold_writes: thresholdWrites,
            stats: result.stats,
        };
    }
    async loadInputs(args) {
        const billQuery = {
            portfolio_id: args.portfolio_id,
            property_id: args.property_id,
            status: 'accepted',
        };
        if (args.session_id)
            billQuery.session_id = args.session_id;
        const billDocs = await this.billModel.find(billQuery).lean();
        const unitDocs = await this.unitModel
            .find({
            portfolio_id: args.portfolio_id,
            property_id: args.property_id,
            status: 'active',
        })
            .lean();
        if (unitDocs.length === 0) {
            throw new common_1.NotFoundException(`No active units found for property ${args.property_id}`);
        }
        const bills = billDocs
            .filter((b) => b.total_amount !== null && b.invoice_date !== null)
            .map((b) => ({
            billId: b.billId,
            total_amount: b.total_amount,
            expense_category: b.expense_category ?? null,
            calendar_year: b.invoice_date.getUTCFullYear(),
            service_period_start: b.service_period_start ?? b.invoice_date,
        }))
            .sort((a, b) => {
            const aT = a.service_period_start
                ? a.service_period_start instanceof Date
                    ? a.service_period_start.toISOString()
                    : a.service_period_start
                : '';
            const bT = b.service_period_start
                ? b.service_period_start instanceof Date
                    ? b.service_period_start.toISOString()
                    : b.service_period_start
                : '';
            if (aT < bT)
                return -1;
            if (aT > bT)
                return 1;
            return a.billId < b.billId ? -1 : 1;
        });
        const tenantNameByUnit = await this.resolveTenantNamesForUnits(unitDocs.map((u) => u.unitId));
        const units = unitDocs.map((u) => ({
            unit_id: u.unitId,
            unit_code: u.unit_code ?? null,
            tenant_name: tenantNameByUnit.get(u.unitId) ?? null,
            occupancy_status: (u.occupancy_status ?? 'occupied'),
            cam_allocation: u.cam_allocation
                ? {
                    base_amount: u.cam_allocation.base_amount,
                    base_year: u.cam_allocation.base_year,
                    share_pct: u.cam_allocation.share_pct,
                    exclusions: u.cam_allocation.exclusions ?? [],
                    admin_fee_pct: u.cam_allocation.admin_fee_pct ?? null,
                    rule_ids: u.cam_allocation.rule_ids ?? [],
                    rule_name: u.cam_allocation.rule_name ?? '',
                }
                : null,
        }));
        const years = Array.from(new Set(bills.map((b) => b.calendar_year)));
        const thresholdDocs = await this.thresholdModel
            .find({
            property_id: args.property_id,
            calendar_year: { $in: years },
        })
            .lean();
        const thresholdsByKey = new Map();
        for (const t of thresholdDocs) {
            thresholdsByKey.set(`${t.unit_id}-${t.calendar_year}`, t.threshold_amount);
        }
        return { bills, units, thresholdsByKey };
    }
    async resolveTenantNamesForUnits(unitIds) {
        const result = new Map();
        if (unitIds.length === 0)
            return result;
        const leases = await this.leaseModel
            .find({
            unit_id: { $in: [...unitIds] },
            status: 'processed',
        })
            .sort({ updatedAt: -1 })
            .select({ unit_id: 1, lease_information: 1 })
            .lean();
        for (const l of leases) {
            if (!l.unit_id || result.has(l.unit_id))
                continue;
            const inner = l.lease_information
                ?.leaseInformation;
            const name = (typeof inner?.leaseTo?.value === 'string' && inner.leaseTo.value.trim()) ||
                (typeof inner?.tenant?.value === 'string' && inner.tenant.value.trim()) ||
                null;
            if (name)
                result.set(l.unit_id, name);
        }
        return result;
    }
    async markBillsCommitted(portfolioId, billIds) {
        if (billIds.length === 0)
            return 0;
        const res = await this.billModel.updateMany({
            portfolio_id: portfolioId,
            billId: { $in: [...billIds] },
            status: 'accepted',
        }, { $set: { status: 'committed' } });
        return res.modifiedCount ?? 0;
    }
    toPreviewInvoice(r, portfolioId, propertyId, units) {
        const unit = units.find((u) => u.unit_id === r.unit_id);
        return {
            billId: r.billId,
            unit_id: r.unit_id,
            unit_code: unit?.unit_code ?? null,
            property_id: propertyId,
            portfolio_id: portfolioId,
            case_type: r.case_type,
            calendar_year: r.calendar_year,
            bill_amount: r.bill_amount,
            share_pct: r.share_pct,
            base_amount_at_time: r.base_amount_at_time,
            base_year_at_time: r.base_year_at_time,
            admin_fee_pct_at_time: r.admin_fee_pct_at_time,
            threshold_before: r.threshold_before,
            threshold_after: r.threshold_after,
            under_base_portion: r.under_base_portion,
            over_base_portion: r.over_base_portion,
            admin_fee: r.admin_fee,
            invoice_amount: r.invoice_amount,
            expense_category: r.expense_category,
            applied_cam_rule_ids: r.applied_cam_rule_ids,
            is_excluded: r.is_excluded,
        };
    }
    computeThresholdDeltas(before, after, invoices) {
        const seen = new Set();
        const out = [];
        for (const inv of invoices) {
            const key = `${inv.unit_id}-${inv.calendar_year}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const prev = before.get(key) ?? 0;
            const value = after[key] ?? prev;
            if (Math.abs(value - prev) < 0.0005)
                continue;
            out.push({
                unit_id: inv.unit_id,
                calendar_year: inv.calendar_year,
                threshold_before: prev,
                threshold_after: value,
                delta: value - prev,
            });
        }
        return out;
    }
};
exports.InvoiceGenerationService = InvoiceGenerationService;
exports.InvoiceGenerationService = InvoiceGenerationService = InvoiceGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bill_schema_1.Bill.name)),
    __param(1, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(2, (0, mongoose_1.InjectModel)(tenant_invoice_schema_1.TenantInvoice.name)),
    __param(3, (0, mongoose_1.InjectModel)(unit_threshold_schema_1.UnitThreshold.name)),
    __param(4, (0, mongoose_1.InjectModel)(lease_schema_1.Lease.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], InvoiceGenerationService);
function toInvoicePayload(d) {
    return {
        invoiceId: d.invoiceId,
        unit_id: d.unit_id,
        billId: d.billId,
        invoice_amount: d.invoice_amount,
        case_type: d.case_type,
        calendar_year: d.calendar_year,
    };
}
//# sourceMappingURL=invoice-generation.service.js.map