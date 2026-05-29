"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const engine_1 = require("../src/cam/engine");
function approxEqual(actual, expected, label) {
    const EPSILON = 0.005;
    if (Math.abs(actual - expected) > EPSILON) {
        throw new strict_1.default.AssertionError({
            message: `${label}: expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff ${(actual - expected).toFixed(4)})`,
            actual,
            expected,
        });
    }
}
let passed = 0;
let failed = 0;
const failures = [];
function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed += 1;
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  ✗ ${name}`);
        console.log(`      ${msg}`);
        failures.push(`${name}: ${msg}`);
        failed += 1;
    }
}
function suite(name, fn) {
    console.log(`\n${name}`);
    fn();
}
const subwayRule = {
    base_amount: 8400,
    base_year: 2022,
    share_pct: 0.0482,
    exclusions: ['Property Taxes', 'Management Fees'],
    rule_ids: ['CAM-014', 'CAM-014.2'],
    rule_name: 'Base Year Stop',
};
const greatClipsRule = {
    base_amount: 0,
    base_year: 2021,
    share_pct: 0.0313,
    exclusions: [],
    rule_ids: ['CAM-007'],
    rule_name: 'NNN — Full Pass-through',
};
const pho88Rule = {
    base_amount: 6500,
    base_year: 2020,
    share_pct: 0.0625,
    exclusions: ['Property Taxes'],
    rule_ids: ['CAM-009'],
    rule_name: 'Base Year Stop',
};
const verizonRule = {
    base_amount: 0,
    base_year: 2019,
    share_pct: 0.0833,
    exclusions: [],
    admin_fee_pct: 0.05,
    rule_ids: ['CAM-007', 'CAM-022'],
    rule_name: 'NNN + 5% Admin Fee',
};
function makeBill(overrides) {
    return {
        expense_category: 'Electricity',
        calendar_year: 2026,
        service_period_start: '2026-04-01',
        ...overrides,
    };
}
function makeUnit(overrides) {
    return {
        unit_code: overrides.unit_id.toUpperCase(),
        tenant_name: overrides.unit_id,
        occupancy_status: 'occupied',
        cam_allocation: null,
        ...overrides,
    };
}
suite('applyBillToUnit — four-case algorithm', () => {
    test('pre-base: under base, no invoice, threshold updates', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'b1', total_amount: 3000 }), 'u-pre', { ...subwayRule, base_amount: 10000 }, 6000);
        strict_1.default.equal(r.case_type, 'pre_base');
        approxEqual(r.threshold_after, 9000, 'threshold_after');
        approxEqual(r.under_base_portion, 3000, 'under_base_portion (full bill)');
        approxEqual(r.over_base_portion, 0, 'over_base_portion');
        approxEqual(r.invoice_amount, 0, 'invoice_amount');
        strict_1.default.equal(r.is_excluded, false);
    });
    test('post-base: already past base before bill, full pass-through', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'b2', total_amount: 1284.50 }), 'u-post', subwayRule, 13816.40);
        strict_1.default.equal(r.case_type, 'post_base');
        approxEqual(r.threshold_after, 15100.90, 'threshold_after');
        approxEqual(r.under_base_portion, 0, 'under_base_portion');
        approxEqual(r.over_base_portion, 1284.50, 'over_base_portion = full bill');
        approxEqual(r.invoice_amount, 61.91, 'billable = bill × share');
        approxEqual(r.admin_fee, 0, 'no admin fee on Subway rule');
    });
    test('crossover: Subway u2 — bill straddles base, partial invoice', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'b1', total_amount: 5482.40 }), 'u2', subwayRule, 8334);
        strict_1.default.equal(r.case_type, 'crossover');
        approxEqual(r.threshold_after, 13816.40, 'threshold_after');
        approxEqual(r.under_base_portion, 66, 'under_base = 8400 − 8334');
        approxEqual(r.over_base_portion, 5416.40, 'over_base = 13816.40 − 8400');
        approxEqual(r.invoice_amount, 261.07, 'billable = over × share');
    });
    test('crossover from zero: threshold=0, base=10000, bill=$15000', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'bx', total_amount: 15000 }), 'u-x', { ...subwayRule, base_amount: 10000, share_pct: 0.066 }, 0);
        strict_1.default.equal(r.case_type, 'crossover');
        approxEqual(r.under_base_portion, 10000, 'under_base = full base');
        approxEqual(r.over_base_portion, 5000, 'over_base = bill − base');
        approxEqual(r.invoice_amount, 5000 * 0.066, 'billable = 5000 × 6.6%');
    });
    test('worked example from spec: threshold=9000, base=10000, bill=$2000, share=6.6%', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'spec', total_amount: 2000 }), 'u-spec', { base_amount: 10000, base_year: 2022, share_pct: 0.066, exclusions: [] }, 9000);
        strict_1.default.equal(r.case_type, 'crossover');
        approxEqual(r.under_base_portion, 1000, 'under_base = 1000 (absorbed)');
        approxEqual(r.over_base_portion, 1000, 'over_base = 1000');
        approxEqual(r.invoice_amount, 66, 'billable = $66 (1000 × 6.6%)');
        approxEqual(r.threshold_after, 11000, 'threshold_after = 11000');
    });
    test('exactly-at-base edge: threshold_after == base falls to pre-base', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'edge', total_amount: 1000 }), 'u-edge', { base_amount: 10000, base_year: 2022, share_pct: 0.066, exclusions: [] }, 9000);
        strict_1.default.equal(r.case_type, 'pre_base');
        approxEqual(r.under_base_portion, 1000, 'full bill absorbed');
        approxEqual(r.over_base_portion, 0, 'no overage');
        approxEqual(r.invoice_amount, 0, 'no invoice yet');
        approxEqual(r.threshold_after, 10000, 'threshold exactly at base');
    });
    test('post-base on NNN (base=0): first bill is post_base, not crossover', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'nnn', total_amount: 2000 }), 'u-nnn', greatClipsRule, 0);
        strict_1.default.equal(r.case_type, 'post_base');
        approxEqual(r.over_base_portion, 2000, 'full bill flows past base');
        approxEqual(r.invoice_amount, 2000 * 0.0313, 'NNN full pass-through');
    });
    test('admin fee: Verizon (NNN + 5%), threshold past base', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'vz', total_amount: 5482.40 }), 'u6', verizonRule, 18920);
        strict_1.default.equal(r.case_type, 'post_base');
        approxEqual(r.admin_fee, 22.83, 'admin = billable × admin_fee_pct');
        approxEqual(r.invoice_amount, 479.52, 'billable includes admin fee');
    });
    test('admin fee on crossover: only the over portion gets the fee', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'ax', total_amount: 2000 }), 'u-admin', { base_amount: 10000, base_year: 2022, share_pct: 0.066, exclusions: [], admin_fee_pct: 0.05 }, 9000);
        strict_1.default.equal(r.case_type, 'crossover');
        approxEqual(r.admin_fee, 3.30, 'admin = $66 × 5%');
        approxEqual(r.invoice_amount, 69.30, 'billable = $66 + $3.30');
    });
});
suite('Excluded bills update threshold but produce $0 invoice', () => {
    test('exclusion when under base: threshold grows, no invoice', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'tx1', total_amount: 5000, expense_category: 'Property Taxes' }), 'u2', subwayRule, 0);
        strict_1.default.equal(r.case_type, 'excluded');
        strict_1.default.equal(r.is_excluded, true);
        approxEqual(r.threshold_after, 5000, 'threshold updates by full bill');
        approxEqual(r.invoice_amount, 0, 'no invoice for excluded category');
        approxEqual(r.under_base_portion, 0, 'we do not double-count via under/over');
        approxEqual(r.over_base_portion, 0, 'we do not double-count via under/over');
    });
    test('exclusion past base: still no invoice, threshold still updates', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'tx2', total_amount: 5000, expense_category: 'Property Taxes' }), 'u2', subwayRule, 15000);
        strict_1.default.equal(r.case_type, 'excluded');
        approxEqual(r.threshold_after, 20000, 'threshold still grows');
        approxEqual(r.invoice_amount, 0, 'past-base excluded still produces no invoice');
    });
    test('exclusion that crosses base: cushion consumed but no invoice', () => {
        const r = (0, engine_1.applyBillToUnit)(makeBill({ billId: 'tx3', total_amount: 5000, expense_category: 'Property Taxes' }), 'u2', subwayRule, 6000);
        strict_1.default.equal(r.case_type, 'excluded');
        approxEqual(r.threshold_after, 11000, 'cushion consumed past base');
        approxEqual(r.invoice_amount, 0, 'no invoice — category is excluded');
    });
});
suite('generateInvoicesForBatch orchestrator', () => {
    test('streaming variant preserves caller threshold map', () => {
        const subwayUnit = makeUnit({ unit_id: 'u2', cam_allocation: subwayRule });
        const initialMap = { 'u2-2026': 8334 };
        const res = (0, engine_1.generateInvoicesForBatch)([makeBill({ billId: 'b1', total_amount: 5482.40 })], [subwayUnit], { initial_thresholds: initialMap });
        strict_1.default.equal(initialMap['u2-2026'], 8334, 'caller map untouched');
        strict_1.default.equal(res.final_thresholds['u2-2026'], 13816.40);
        strict_1.default.equal(res.invoices.length, 1);
        strict_1.default.equal(res.invoices[0].case_type, 'crossover');
        approxEqual(res.invoices[0].invoice_amount, 261.07, 'Subway crossover');
    });
    test('vacant unit is skipped (no invoice, no threshold)', () => {
        const vacant = makeUnit({
            unit_id: 'u-vacant',
            occupancy_status: 'vacant',
            cam_allocation: subwayRule,
        });
        const res = (0, engine_1.generateInvoicesForBatch)([makeBill({ billId: 'bv', total_amount: 1000 })], [vacant]);
        strict_1.default.equal(res.invoices.length, 0, 'no invoice for vacant unit');
        strict_1.default.equal(Object.keys(res.final_thresholds).length, 0, 'no threshold entry');
    });
    test('unit with null cam_allocation is skipped', () => {
        const unconfigured = makeUnit({ unit_id: 'u-null', cam_allocation: null });
        const res = (0, engine_1.generateInvoicesForBatch)([makeBill({ billId: 'bu', total_amount: 1000 })], [unconfigured]);
        strict_1.default.equal(res.invoices.length, 0);
    });
    test('calendar year reset: same unit, two years, separate thresholds', () => {
        const unit = makeUnit({ unit_id: 'u-y', cam_allocation: { ...subwayRule, base_amount: 10000 } });
        const res = (0, engine_1.generateInvoicesForBatch)([
            makeBill({ billId: 'b25a', total_amount: 8000, calendar_year: 2025 }),
            makeBill({ billId: 'b25b', total_amount: 5000, calendar_year: 2025 }),
            makeBill({ billId: 'b26', total_amount: 4000, calendar_year: 2026 }),
        ], [unit]);
        strict_1.default.equal(res.final_thresholds['u-y-2025'], 13000);
        strict_1.default.equal(res.final_thresholds['u-y-2026'], 4000);
        const cases = res.invoices.map((i) => `${i.calendar_year}:${i.case_type}`);
        strict_1.default.deepEqual(cases, ['2025:pre_base', '2025:crossover', '2026:pre_base']);
    });
    test('idempotency: applied_bill_ids skip is honored', () => {
        const unit = makeUnit({ unit_id: 'u-i', cam_allocation: greatClipsRule });
        const res = (0, engine_1.generateInvoicesForBatch)([
            makeBill({ billId: 'b-new', total_amount: 1000 }),
            makeBill({ billId: 'b-seen', total_amount: 9999 }),
        ], [unit], { applied_bill_ids: new Set(['b-seen']) });
        strict_1.default.equal(res.invoices.length, 1, 'only the new bill produces invoices');
        strict_1.default.equal(res.invoices[0].billId, 'b-new');
        strict_1.default.equal(res.stats.bills_skipped, 1);
    });
    test('multi-unit allocation: same bill produces one invoice per occupied unit', () => {
        const subwayU = makeUnit({ unit_id: 'u2', cam_allocation: subwayRule });
        const clipsU = makeUnit({ unit_id: 'u3', cam_allocation: greatClipsRule });
        const phoU = makeUnit({ unit_id: 'u4', cam_allocation: pho88Rule });
        const verzU = makeUnit({ unit_id: 'u6', cam_allocation: verizonRule });
        const res = (0, engine_1.generateInvoicesForBatch)([makeBill({ billId: 'b-shared', total_amount: 5482.40 })], [subwayU, clipsU, phoU, verzU]);
        strict_1.default.equal(res.invoices.length, 4, 'one invoice per occupied unit');
        strict_1.default.equal(res.final_thresholds['u2-2026'], 5482.40);
        strict_1.default.equal(res.final_thresholds['u3-2026'], 5482.40);
        strict_1.default.equal(res.final_thresholds['u4-2026'], 5482.40);
        strict_1.default.equal(res.final_thresholds['u6-2026'], 5482.40);
    });
    test('streaming order-dependence: same bills different order → different invoiced totals', () => {
        const unit = makeUnit({
            unit_id: 'u-od',
            cam_allocation: {
                base_amount: 10000,
                base_year: 2022,
                share_pct: 0.066,
                exclusions: ['Property Taxes'],
            },
        });
        const orderA = [
            makeBill({ billId: 'h', total_amount: 6000, expense_category: 'Electricity' }),
            makeBill({ billId: 't', total_amount: 5000, expense_category: 'Property Taxes' }),
            makeBill({ billId: 'l', total_amount: 2000, expense_category: 'Landscaping & Grounds' }),
            makeBill({ billId: 'j', total_amount: 4000, expense_category: 'Janitorial & Cleaning' }),
            makeBill({ billId: 's', total_amount: 1500, expense_category: 'Snow & Ice Removal' }),
        ];
        const orderB = [orderA[0], orderA[2], orderA[3], orderA[4], orderA[1]];
        const resA = (0, engine_1.generateInvoicesForBatch)(orderA, [unit]);
        const resB = (0, engine_1.generateInvoicesForBatch)(orderB, [unit]);
        const totalA = resA.invoices.reduce((s, i) => s + i.invoice_amount, 0);
        const totalB = resB.invoices.reduce((s, i) => s + i.invoice_amount, 0);
        approxEqual(totalA, 495, 'Order A (tax-first crossover) total');
        approxEqual(totalB, 231, 'Order B (recoverable-first crossover) total');
        strict_1.default.notEqual(totalA, totalB, 'order matters — expected');
    });
});
suite('replayChronologically — canonical order', () => {
    test('replay always starts threshold from 0, ignores caller threshold', () => {
        const unit = makeUnit({ unit_id: 'u-r', cam_allocation: subwayRule });
        const res = (0, engine_1.replayChronologically)([
            makeBill({ billId: 'r1', total_amount: 5000, service_period_start: '2026-03-01' }),
            makeBill({ billId: 'r2', total_amount: 4000, service_period_start: '2026-01-15' }),
            makeBill({ billId: 'r3', total_amount: 2000, service_period_start: '2026-02-10' }),
        ], [unit]);
        const order = res.invoices.map((i) => i.billId);
        strict_1.default.deepEqual(order, ['r2', 'r3', 'r1'], 'sorted by service_period_start');
        approxEqual(res.invoices[0].invoice_amount, 0, 'r2 pre-base');
        approxEqual(res.invoices[1].invoice_amount, 0, 'r3 pre-base');
        approxEqual(res.invoices[2].invoice_amount, 125.32, 'r1 crossover');
    });
    test('replay produces same canonical total regardless of input order', () => {
        const unit = makeUnit({ unit_id: 'u-c', cam_allocation: { ...subwayRule, base_amount: 10000 } });
        const bills = [
            makeBill({ billId: 'a', total_amount: 3000, service_period_start: '2026-01-10' }),
            makeBill({ billId: 'b', total_amount: 4000, service_period_start: '2026-02-15' }),
            makeBill({ billId: 'c', total_amount: 5000, service_period_start: '2026-03-20' }),
        ];
        const forward = (0, engine_1.replayChronologically)(bills, [unit]);
        const reversed = (0, engine_1.replayChronologically)([...bills].reverse(), [unit]);
        const totalF = forward.invoices.reduce((s, i) => s + i.invoice_amount, 0);
        const totalR = reversed.invoices.reduce((s, i) => s + i.invoice_amount, 0);
        approxEqual(totalF, totalR, 'replay is order-independent');
    });
});
suite('diffInvoiceSets — canonical vs actual', () => {
    test('matching invoices produce no diff lines', () => {
        const unit = makeUnit({ unit_id: 'u-d', cam_allocation: greatClipsRule });
        const canonical = (0, engine_1.generateInvoicesForBatch)([makeBill({ billId: 'b', total_amount: 1000 })], [unit]).invoices;
        const actual = canonical.map((c) => ({
            invoiceId: `inv_${c.billId}`,
            billId: c.billId,
            unit_id: c.unit_id,
            invoice_amount: c.invoice_amount,
            threshold_after: c.threshold_after,
        }));
        const d = (0, engine_1.diffInvoiceSets)(canonical, actual);
        strict_1.default.equal(d.total_delta, 0);
        strict_1.default.equal(d.units_with_discrepancies, 0);
        strict_1.default.equal(d.by_unit[0].lines.length, 0);
    });
    test('actual under-invoiced → positive delta line', () => {
        const canonical = [
            {
                billId: 'b1',
                unit_id: 'u-d',
                case_type: 'post_base',
                calendar_year: 2026,
                bill_amount: 1000,
                share_pct: 0.0313,
                base_amount_at_time: 0,
                base_year_at_time: 2021,
                admin_fee_pct_at_time: null,
                threshold_before: 0,
                threshold_after: 1000,
                under_base_portion: 0,
                over_base_portion: 1000,
                admin_fee: 0,
                invoice_amount: 31.30,
                expense_category: 'Electricity',
                applied_cam_rule_ids: ['CAM-007'],
                is_excluded: false,
            },
        ];
        const actual = [
            { invoiceId: 'inv-1', billId: 'b1', unit_id: 'u-d', invoice_amount: 25.00 },
        ];
        const d = (0, engine_1.diffInvoiceSets)(canonical, actual);
        approxEqual(d.total_delta, 6.30, 'canonical 31.30 − actual 25.00');
        strict_1.default.equal(d.by_unit.length, 1);
        strict_1.default.equal(d.by_unit[0].lines.length, 1);
        approxEqual(d.by_unit[0].lines[0].delta, 6.30, 'line-level delta');
        strict_1.default.equal(d.bills_affected, 1);
    });
    test('missing actual invoice → canonical-side reason', () => {
        const canonical = [
            {
                billId: 'b-missing',
                unit_id: 'u-d',
                case_type: 'post_base',
                calendar_year: 2026,
                bill_amount: 2000,
                share_pct: 0.05,
                base_amount_at_time: 0,
                base_year_at_time: 2022,
                admin_fee_pct_at_time: null,
                threshold_before: 0,
                threshold_after: 2000,
                under_base_portion: 0,
                over_base_portion: 2000,
                admin_fee: 0,
                invoice_amount: 100,
                expense_category: 'Electricity',
                applied_cam_rule_ids: [],
                is_excluded: false,
            },
        ];
        const d = (0, engine_1.diffInvoiceSets)(canonical, []);
        strict_1.default.equal(d.by_unit.length, 1);
        strict_1.default.equal(d.by_unit[0].lines.length, 1);
        approxEqual(d.by_unit[0].lines[0].delta, 100, 'missing → full canonical amount');
        strict_1.default.equal(d.by_unit[0].lines[0].original_invoice_id, null);
    });
});
console.log(`\n${passed} passed · ${failed} failed`);
if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures)
        console.log(`  - ${f}`);
    process.exit(1);
}
process.exit(0);
//# sourceMappingURL=verify-cam-engine.js.map