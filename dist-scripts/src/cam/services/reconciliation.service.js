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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const unit_schema_1 = require("../../unit/schemas/unit.schema");
const engine_1 = require("../engine");
const bill_schema_1 = require("../schemas/bill.schema");
const reconciliation_run_schema_1 = require("../schemas/reconciliation-run.schema");
const tenant_invoice_schema_1 = require("../schemas/tenant-invoice.schema");
const ids_1 = require("../utils/ids");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor(billModel, unitModel, invoiceModel, runModel) {
        this.billModel = billModel;
        this.unitModel = unitModel;
        this.invoiceModel = invoiceModel;
        this.runModel = runModel;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    async run(args) {
        const { portfolio_id, property_id, calendar_year } = args;
        const apply = args.apply === true;
        const unitDocs = await this.unitModel
            .find({
            portfolio_id,
            property_id,
            status: 'active',
            ...(args.unit_id ? { unitId: args.unit_id } : {}),
        })
            .lean();
        if (unitDocs.length === 0) {
            throw new common_1.NotFoundException(`No active units for property ${property_id}`);
        }
        const billDocs = await this.billModel
            .find({
            portfolio_id,
            property_id,
            status: { $in: ['accepted', 'committed'] },
        })
            .lean();
        const billsThisYear = billDocs.filter((b) => b.invoice_date != null &&
            b.invoice_date.getUTCFullYear() === calendar_year);
        if (billsThisYear.length === 0) {
            throw new common_1.BadRequestException(`No bills for property ${property_id} in ${calendar_year}`);
        }
        const invoiceDocs = await this.invoiceModel
            .find({
            portfolio_id,
            property_id,
            calendar_year,
            invoice_kind: 'original',
            status: { $in: ['committed', 'draft'] },
            ...(args.unit_id ? { unit_id: args.unit_id } : {}),
        })
            .lean();
        const bills = billsThisYear
            .filter((b) => b.total_amount !== null)
            .map((b) => ({
            billId: b.billId,
            total_amount: b.total_amount,
            expense_category: b.expense_category ?? null,
            calendar_year,
            service_period_start: b.service_period_start ?? b.invoice_date ?? null,
        }));
        const units = unitDocs.map((u) => ({
            unit_id: u.unitId,
            unit_code: u.unit_code ?? null,
            tenant_name: null,
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
        const canonical = (0, engine_1.replayChronologically)(bills, units);
        const actualLite = invoiceDocs.map((i) => ({
            invoiceId: i.invoiceId,
            billId: i.billId ?? null,
            unit_id: i.unit_id,
            invoice_amount: i.invoice_amount,
            threshold_after: i.threshold_after ?? null,
        }));
        const diff = (0, engine_1.diffInvoiceSets)(canonical.invoices, actualLite);
        const now = new Date();
        const unitCodeByUnit = new Map(unitDocs.map((u) => [u.unitId, u.unit_code]));
        const adjustmentInvoiceIdsByUnit = new Map();
        if (apply) {
            for (const u of diff.by_unit) {
                if (Math.abs(u.delta) < 0.005 || u.lines.length === 0)
                    continue;
                const lineItems = u.lines.map((l) => {
                    const billDoc = billsThisYear.find((b) => b.billId === l.billId);
                    return {
                        billId: l.billId,
                        bill_vendor_name: billDoc?.vendor_name ?? null,
                        bill_invoice_date: billDoc?.invoice_date ?? null,
                        bill_total_amount: billDoc?.total_amount ?? null,
                        original_invoice_id: l.original_invoice_id,
                        original_invoiced_amount: l.original_invoiced_amount,
                        canonical_invoiced_amount: l.canonical_invoiced_amount,
                        delta: l.delta,
                        reason: l.reason,
                    };
                });
                const adjustment = await this.invoiceModel.create({
                    invoiceId: (0, ids_1.newInvoiceId)(),
                    invoice_kind: 'adjustment',
                    billId: null,
                    unit_id: u.unit_id,
                    property_id,
                    portfolio_id,
                    unit_code: unitCodeByUnit.get(u.unit_id) ?? null,
                    tenant_name: null,
                    bill_amount: null,
                    share_pct: null,
                    base_amount_at_time: null,
                    base_year_at_time: null,
                    admin_fee_pct_at_time: null,
                    threshold_before: null,
                    threshold_after: null,
                    under_base_portion: 0,
                    over_base_portion: 0,
                    admin_fee: 0,
                    invoice_amount: u.delta,
                    case_type: null,
                    calendar_year,
                    expense_category: null,
                    applied_cam_rule_ids: [],
                    status: 'committed',
                    committed_at: now,
                    committed_by: args.actor ?? null,
                    tenant_paid_amount: null,
                    variance_tag: null,
                    payment_history: [],
                    reminders: [],
                    line_items: lineItems,
                });
                adjustmentInvoiceIdsByUnit.set(u.unit_id, adjustment.invoiceId);
            }
        }
        const mode = apply ? 'applied' : 'preview';
        const runDoc = await this.runModel.create({
            runId: (0, ids_1.newReconRunId)(),
            property_id,
            portfolio_id,
            unit_id: args.unit_id ?? null,
            calendar_year,
            mode,
            triggered_by: args.actor ?? 'unknown',
            triggered_at: now,
            total_delta: diff.total_delta,
            units_with_discrepancies: diff.units_with_discrepancies,
            bills_affected: diff.bills_affected,
            by_unit: diff.by_unit.map((u) => ({
                unit_id: u.unit_id,
                unit_code: unitCodeByUnit.get(u.unit_id) ?? null,
                tenant_name: null,
                actual_invoiced_total: u.actual_invoiced_total,
                canonical_invoiced_total: u.canonical_invoiced_total,
                delta: u.delta,
                actual_threshold_eoy: u.actual_threshold_eoy,
                canonical_threshold_eoy: u.canonical_threshold_eoy,
                adjustment_invoiceId: adjustmentInvoiceIdsByUnit.get(u.unit_id) ?? null,
            })),
            adjustments_created: Array.from(adjustmentInvoiceIdsByUnit.values()),
            applied_at: apply ? now : null,
            applied_by: apply ? args.actor ?? null : null,
            apply_reason: apply ? args.apply_reason ?? null : null,
        });
        return {
            run: runDoc.toObject(),
            diff,
            adjustment_invoice_ids: Array.from(adjustmentInvoiceIdsByUnit.values()),
        };
    }
    async listRuns(filter) {
        const q = { portfolio_id: filter.portfolio_id };
        if (filter.property_id)
            q.property_id = filter.property_id;
        if (filter.calendar_year)
            q.calendar_year = filter.calendar_year;
        if (filter.mode)
            q.mode = filter.mode;
        return this.runModel
            .find(q)
            .sort({ triggered_at: -1 })
            .limit(filter.limit ?? 50)
            .lean();
    }
    async getRun(portfolioId, runId) {
        const doc = await this.runModel
            .findOne({ portfolio_id: portfolioId, runId })
            .lean();
        if (!doc)
            throw new common_1.NotFoundException(`Reconciliation run ${runId} not found`);
        return doc;
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bill_schema_1.Bill.name)),
    __param(1, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(2, (0, mongoose_1.InjectModel)(tenant_invoice_schema_1.TenantInvoice.name)),
    __param(3, (0, mongoose_1.InjectModel)(reconciliation_run_schema_1.ReconciliationRun.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map