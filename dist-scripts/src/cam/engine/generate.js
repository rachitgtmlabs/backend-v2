"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicesForBatch = generateInvoicesForBatch;
const apply_bill_1 = require("./apply-bill");
const types_1 = require("./types");
function generateInvoicesForBatch(bills, units, options = {}) {
    const orderedBills = options.ordering === 'chronological' ? sortChronologically(bills) : [...bills];
    const thresholds = {
        ...(options.ordering === 'chronological'
            ? {}
            : options.initial_thresholds ?? {}),
    };
    const appliedBillIds = options.applied_bill_ids ?? new Set();
    const eligibleUnits = units.filter((u) => u.occupancy_status === 'occupied' && u.cam_allocation !== null);
    const invoices = [];
    let billsProcessed = 0;
    let billsSkipped = 0;
    for (const bill of orderedBills) {
        if (appliedBillIds.has(bill.billId)) {
            billsSkipped += 1;
            continue;
        }
        if (bill.total_amount == null || Number.isNaN(bill.total_amount)) {
            billsSkipped += 1;
            continue;
        }
        billsProcessed += 1;
        for (const unit of eligibleUnits) {
            const rule = unit.cam_allocation;
            const key = (0, types_1.thresholdKey)(unit.unit_id, bill.calendar_year);
            const thresholdBefore = thresholds[key] ?? 0;
            const result = (0, apply_bill_1.applyBillToUnit)(bill, unit.unit_id, rule, thresholdBefore);
            thresholds[key] = result.threshold_after;
            invoices.push(result);
        }
    }
    const stats = {
        bills_processed: billsProcessed,
        bills_skipped: billsSkipped,
        units_processed: eligibleUnits.length,
        invoices_produced: invoices.length,
        invoices_with_billable_gt_zero: invoices.filter((i) => i.invoice_amount > 0)
            .length,
        invoices_excluded: invoices.filter((i) => i.case_type === 'excluded').length,
        invoices_crossover: invoices.filter((i) => i.case_type === 'crossover')
            .length,
    };
    return { invoices, final_thresholds: thresholds, stats };
}
function sortChronologically(bills) {
    return [...bills].sort((a, b) => {
        const aDate = toComparable(a.service_period_start);
        const bDate = toComparable(b.service_period_start);
        if (aDate < bDate)
            return -1;
        if (aDate > bDate)
            return 1;
        return a.billId < b.billId ? -1 : a.billId > b.billId ? 1 : 0;
    });
}
function toComparable(d) {
    if (d == null)
        return '';
    if (d instanceof Date)
        return d.toISOString();
    return d;
}
//# sourceMappingURL=generate.js.map