"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffInvoiceSets = diffInvoiceSets;
function diffInvoiceSets(canonical, actual) {
    const EPSILON = 0.005;
    const actualByKey = new Map();
    for (const inv of actual) {
        if (inv.billId == null)
            continue;
        actualByKey.set(`${inv.billId}::${inv.unit_id}`, inv);
    }
    const perUnit = new Map();
    const ensureUnit = (unitId) => {
        let u = perUnit.get(unitId);
        if (!u) {
            u = {
                unit_id: unitId,
                actual_invoiced_total: 0,
                canonical_invoiced_total: 0,
                delta: 0,
                actual_threshold_eoy: 0,
                canonical_threshold_eoy: 0,
                lines: [],
            };
            perUnit.set(unitId, u);
        }
        return u;
    };
    for (const can of canonical) {
        const u = ensureUnit(can.unit_id);
        u.canonical_invoiced_total += can.invoice_amount;
        if (can.threshold_after > u.canonical_threshold_eoy) {
            u.canonical_threshold_eoy = can.threshold_after;
        }
        const key = `${can.billId}::${can.unit_id}`;
        const act = actualByKey.get(key);
        actualByKey.delete(key);
        const actualAmount = act?.invoice_amount ?? 0;
        const delta = can.invoice_amount - actualAmount;
        if (act) {
            u.actual_invoiced_total += actualAmount;
            if ((act.threshold_after ?? 0) > u.actual_threshold_eoy) {
                u.actual_threshold_eoy = act.threshold_after ?? 0;
            }
        }
        if (Math.abs(delta) > EPSILON) {
            u.lines.push({
                billId: can.billId,
                unit_id: can.unit_id,
                original_invoice_id: act?.invoiceId ?? null,
                original_invoiced_amount: actualAmount,
                canonical_invoiced_amount: can.invoice_amount,
                delta,
                reason: act
                    ? `Recalculation differs by ${formatDelta(delta)}`
                    : `Bill missing from ledger — canonical would have invoiced ${formatDelta(can.invoice_amount)}`,
            });
        }
    }
    for (const [, act] of actualByKey) {
        const u = ensureUnit(act.unit_id);
        u.actual_invoiced_total += act.invoice_amount;
        const delta = -act.invoice_amount;
        if (Math.abs(delta) > EPSILON) {
            u.lines.push({
                billId: act.billId,
                unit_id: act.unit_id,
                original_invoice_id: act.invoiceId,
                original_invoiced_amount: act.invoice_amount,
                canonical_invoiced_amount: 0,
                delta,
                reason: `Ledger has invoice with no matching bill in canonical replay`,
            });
        }
    }
    const by_unit = [];
    let totalDelta = 0;
    let unitsWithDiscrepancies = 0;
    const affectedBills = new Set();
    for (const u of perUnit.values()) {
        u.delta = u.canonical_invoiced_total - u.actual_invoiced_total;
        if (Math.abs(u.delta) > EPSILON || u.lines.length > 0) {
            unitsWithDiscrepancies += 1;
        }
        totalDelta += u.delta;
        for (const l of u.lines)
            affectedBills.add(l.billId);
        by_unit.push(u);
    }
    by_unit.sort((a, b) => (a.unit_id < b.unit_id ? -1 : a.unit_id > b.unit_id ? 1 : 0));
    return {
        total_delta: totalDelta,
        units_with_discrepancies: unitsWithDiscrepancies,
        bills_affected: affectedBills.size,
        by_unit,
    };
}
function formatDelta(n) {
    const sign = n >= 0 ? '+' : '−';
    return `${sign}$${Math.abs(n).toFixed(2)}`;
}
//# sourceMappingURL=diff.js.map