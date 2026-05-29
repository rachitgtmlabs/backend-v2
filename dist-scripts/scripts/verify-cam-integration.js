"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const bill_schema_1 = require("../src/cam/schemas/bill.schema");
const expense_category_schema_1 = require("../src/cam/schemas/expense-category.schema");
const reconciliation_run_schema_1 = require("../src/cam/schemas/reconciliation-run.schema");
const tenant_invoice_schema_1 = require("../src/cam/schemas/tenant-invoice.schema");
const unit_threshold_schema_1 = require("../src/cam/schemas/unit-threshold.schema");
const unit_schema_1 = require("../src/unit/schemas/unit.schema");
const bills_service_1 = require("../src/cam/services/bills.service");
const expense_categories_service_1 = require("../src/cam/services/expense-categories.service");
const expense_report_service_1 = require("../src/cam/services/expense-report.service");
const invoice_generation_service_1 = require("../src/cam/services/invoice-generation.service");
const reconciliation_service_1 = require("../src/cam/services/reconciliation.service");
const tenant_invoices_service_1 = require("../src/cam/services/tenant-invoices.service");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';
const SANDBOX_TAG = `cam-itest-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex')}`;
const PORTFOLIO_ID = `por_${SANDBOX_TAG}`;
const PROPERTY_ID = `prp_${SANDBOX_TAG}`;
function approx(actual, expected, label) {
    if (Math.abs(actual - expected) > 0.01) {
        throw new strict_1.default.AssertionError({
            message: `${label}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`,
            actual,
            expected,
        });
    }
}
let passed = 0;
let failed = 0;
const failures = [];
async function step(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed += 1;
    }
    catch (e) {
        const msg = e instanceof Error ? `${e.message}` : String(e);
        console.log(`  ✗ ${name}`);
        console.log(`      ${msg}`);
        failures.push(`${name}: ${msg}`);
        failed += 1;
    }
}
async function main() {
    console.log(`Connecting to ${uri.replace(/\/\/[^@]*@/, '//***@')}`);
    await mongoose_1.default.connect(uri);
    console.log(`Sandbox: ${SANDBOX_TAG}\n`);
    const unitModel = mongoose_1.default.model(unit_schema_1.Unit.name, unit_schema_1.UnitSchema);
    const billModel = mongoose_1.default.model(bill_schema_1.Bill.name, bill_schema_1.BillSchema);
    const invModel = mongoose_1.default.model(tenant_invoice_schema_1.TenantInvoice.name, tenant_invoice_schema_1.TenantInvoiceSchema);
    const thrModel = mongoose_1.default.model(unit_threshold_schema_1.UnitThreshold.name, unit_threshold_schema_1.UnitThresholdSchema);
    const catModel = mongoose_1.default.model(expense_category_schema_1.ExpenseCategory.name, expense_category_schema_1.ExpenseCategorySchema);
    const runModel = mongoose_1.default.model(reconciliation_run_schema_1.ReconciliationRun.name, reconciliation_run_schema_1.ReconciliationRunSchema);
    const bills = new bills_service_1.BillsService(billModel);
    const cats = new expense_categories_service_1.ExpenseCategoriesService(catModel);
    const gen = new invoice_generation_service_1.InvoiceGenerationService(billModel, unitModel, invModel, thrModel);
    const invoices = new tenant_invoices_service_1.TenantInvoicesService(invModel);
    const recon = new reconciliation_service_1.ReconciliationService(billModel, unitModel, invModel, runModel);
    const report = new expense_report_service_1.ExpenseReportService(invModel);
    try {
        const allocations = [
            {
                unit_id: 'u2',
                alloc: {
                    base_amount: 8400,
                    base_year: 2022,
                    share_pct: 0.0482,
                    exclusions: ['Property Taxes'],
                    rule_ids: ['CAM-014'],
                    rule_name: 'Base Year Stop',
                },
            },
            {
                unit_id: 'u3',
                alloc: {
                    base_amount: 0,
                    base_year: 2021,
                    share_pct: 0.0313,
                    exclusions: [],
                    rule_ids: ['CAM-007'],
                    rule_name: 'NNN',
                },
            },
            {
                unit_id: 'u4',
                alloc: {
                    base_amount: 6500,
                    base_year: 2020,
                    share_pct: 0.0625,
                    exclusions: ['Property Taxes'],
                    rule_ids: ['CAM-009'],
                    rule_name: 'Base Year Stop',
                },
            },
            {
                unit_id: 'u6',
                alloc: {
                    base_amount: 0,
                    base_year: 2019,
                    share_pct: 0.0833,
                    exclusions: [],
                    admin_fee_pct: 0.05,
                    rule_ids: ['CAM-022'],
                    rule_name: 'NNN + 5% Admin',
                },
            },
        ];
        for (const a of allocations) {
            await unitModel.create({
                unitId: `unt_${SANDBOX_TAG}_${a.unit_id}`,
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                unit_code: a.unit_id.toUpperCase(),
                unit_name: `Unit ${a.unit_id}`,
                status: 'active',
                occupancy_status: 'occupied',
                cam_allocation: a.alloc,
            });
        }
        console.log('Phase 3 end-to-end flow');
        let bill1Id = '';
        let bill2Id = '';
        let bill3Id = '';
        let bill4Id = '';
        let txBillId = '';
        await step('1. Create 5 bills (4 normal + 1 Property Taxes — placed last chronologically)', async () => {
            const b4 = await bills.create({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                vendor_name: 'Roto Pest',
                invoice_date: '2026-04-15',
                service_period_start: '2026-04-15',
                total_amount: 480,
                expense_category: 'Pest Control',
            });
            const b2 = await bills.create({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                vendor_name: 'GreenScape Lawncare',
                invoice_date: '2026-04-28',
                service_period_start: '2026-04-28',
                total_amount: 2840,
                expense_category: 'Landscaping & Grounds',
            });
            const b3 = await bills.create({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                vendor_name: 'Sunbelt Janitorial',
                invoice_date: '2026-04-29',
                service_period_start: '2026-04-29',
                total_amount: 1620,
                expense_category: 'Janitorial & Cleaning',
            });
            const b1 = await bills.create({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                vendor_name: 'Riverside Utilities',
                invoice_date: '2026-04-30',
                service_period_start: '2026-04-30',
                total_amount: 5482.4,
                expense_category: 'Electricity',
            });
            const tx = await bills.create({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                vendor_name: 'County Tax Authority',
                invoice_date: '2026-05-15',
                service_period_start: '2026-05-15',
                total_amount: 12000,
                expense_category: 'Property Taxes',
            });
            bill1Id = b1.billId;
            bill2Id = b2.billId;
            bill3Id = b3.billId;
            bill4Id = b4.billId;
            txBillId = tx.billId;
            strict_1.default.equal(b1.status, 'extracted');
            strict_1.default.equal(b1.missing_fields.length, 0);
        });
        await step('2. Accept all 5 bills', async () => {
            for (const id of [bill1Id, bill2Id, bill3Id, bill4Id, txBillId]) {
                const r = await bills.transition(PORTFOLIO_ID, id, { to: 'accepted' });
                strict_1.default.equal(r.status, 'accepted');
            }
        });
        let previewSubwayCrossover = 0;
        await step('3. preview() — Subway crossover math matches locked algorithm', async () => {
            const result = await gen.preview({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
            });
            strict_1.default.equal(result.invoices.length, 20, '5 bills × 4 units = 20 invoices');
            const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
            const subwayElec = result.invoices.find((i) => i.unit_id === subwayUnitId && i.billId === bill1Id);
            strict_1.default.ok(subwayElec, 'Subway × Electricity invoice exists');
            strict_1.default.equal(subwayElec.case_type, 'crossover');
            approx(subwayElec.invoice_amount, 97.48, 'Subway crossover billable');
            previewSubwayCrossover = subwayElec.invoice_amount;
            const subwayTx = result.invoices.find((i) => i.unit_id === subwayUnitId && i.billId === txBillId);
            strict_1.default.ok(subwayTx);
            strict_1.default.equal(subwayTx.case_type, 'excluded');
            strict_1.default.equal(subwayTx.invoice_amount, 0);
            strict_1.default.equal(subwayTx.is_excluded, true);
        });
        await step('4. commit() — persists invoices, updates thresholds, flips bills', async () => {
            const result = await gen.commit({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
            });
            strict_1.default.equal(result.invoices.length, 20);
            strict_1.default.equal(result.bills_committed, 5);
            strict_1.default.ok(result.threshold_writes > 0);
            const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
            const persisted = await invModel
                .findOne({
                unit_id: subwayUnitId,
                billId: bill1Id,
                property_id: PROPERTY_ID,
            })
                .lean();
            strict_1.default.ok(persisted);
            approx(persisted.invoice_amount, previewSubwayCrossover, 'preview == commit');
            strict_1.default.equal(persisted.status, 'committed');
            strict_1.default.equal(persisted.case_type, 'crossover');
        });
        await step('4b. commit() is idempotent on retry', async () => {
            const result = await gen.commit({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
            });
            strict_1.default.equal(result.invoices.length, 0, 'no new invoices on rerun');
        });
        await step('5. Ledger lists committed invoices, filterable by category', async () => {
            const all = await invoices.list({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                calendar_year: 2026,
                invoice_kind: 'original',
            });
            strict_1.default.equal(all.length, 20);
            const electric = await invoices.list({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                expense_category: 'Electricity',
                invoice_kind: 'original',
            });
            strict_1.default.equal(electric.length, 4);
        });
        let subwayInvoiceId = '';
        await step('6. Payment recorded → variance tags flip correctly', async () => {
            const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
            const list = await invoices.list({
                portfolio_id: PORTFOLIO_ID,
                unit_id: subwayUnitId,
                calendar_year: 2026,
            });
            const subway = list.find((i) => i.billId === bill1Id);
            strict_1.default.ok(subway);
            subwayInvoiceId = subway.invoiceId;
            const exact = await invoices.recordPayment(subwayInvoiceId, {
                portfolio_id: PORTFOLIO_ID,
                amount: subway.invoice_amount,
                paid_at: '2026-05-15',
                method: 'ACH',
            });
            strict_1.default.equal(exact.variance_tag, 'compliant');
            const under = await invoices.recordPayment(subwayInvoiceId, {
                portfolio_id: PORTFOLIO_ID,
                amount: subway.invoice_amount - 50,
                paid_at: '2026-05-20',
            });
            strict_1.default.equal(under.variance_tag, 'under_billed');
            strict_1.default.equal(under.payment_history.length, 2);
        });
        await step('7. Reconcile preview against own commit → zero delta', async () => {
            const result = await recon.run({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                calendar_year: 2026,
                apply: false,
            });
            approx(result.diff.total_delta, 0, 'preview vs self == 0');
            strict_1.default.equal(result.adjustment_invoice_ids.length, 0);
            strict_1.default.equal(result.run.mode, 'preview');
        });
        await step('8. Nudge invoice + Reconcile apply → adjustment with line_items', async () => {
            const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
            const target = await invModel
                .findOne({
                unit_id: subwayUnitId,
                billId: bill2Id,
                invoice_kind: 'original',
            })
                .lean();
            strict_1.default.ok(target);
            const canonicalAmount = target.invoice_amount;
            await invModel.updateOne({ invoiceId: target.invoiceId }, { $set: { invoice_amount: canonicalAmount - 25 } });
            const result = await recon.run({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                calendar_year: 2026,
                apply: true,
                actor: 'integration-test',
                apply_reason: 'Test adjustment',
            });
            strict_1.default.equal(result.run.mode, 'applied');
            strict_1.default.equal(result.adjustment_invoice_ids.length, 1);
            approx(result.diff.total_delta, 25, 'delta = +$25');
            const adjustment = await invModel
                .findOne({ invoiceId: result.adjustment_invoice_ids[0] })
                .lean();
            strict_1.default.equal(adjustment.invoice_kind, 'adjustment');
            strict_1.default.equal(adjustment.billId, null);
            strict_1.default.ok(adjustment.line_items.length > 0);
            approx(adjustment.invoice_amount, 25, 'adjustment = $25');
        });
        await step('9. Expense report sums match per-category totals', async () => {
            const r = await report.reportByCategory({
                portfolio_id: PORTFOLIO_ID,
                property_id: PROPERTY_ID,
                calendar_year: 2026,
            });
            strict_1.default.ok(r.categories.length > 0);
            const sum = r.categories.reduce((s, c) => s + c.total_invoiced, 0);
            approx(sum, r.total_invoiced, 'category sum == total');
        });
        await step('10. Custom category lifecycle (create/update/delete)', async () => {
            const created = await cats.createCustom({
                portfolio_id: PORTFOLIO_ID,
                name: `Sandbox-${SANDBOX_TAG}`,
                description: 'Integration test',
            });
            strict_1.default.equal(created.is_system, false);
            const list = await cats.listForPortfolio(PORTFOLIO_ID);
            strict_1.default.ok(list.some((c) => c.categoryId === created.categoryId));
            await cats.updateCustom(PORTFOLIO_ID, created.categoryId, {
                recoverable: false,
            });
            await cats.deleteCustom(PORTFOLIO_ID, created.categoryId);
        });
    }
    finally {
        await unitModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await billModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await invModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await thrModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await catModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await runModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
        await mongoose_1.default.disconnect();
    }
    console.log(`\n${passed} passed · ${failed} failed`);
    if (failed > 0) {
        console.log('\nFailures:');
        for (const f of failures)
            console.log(`  - ${f}`);
        process.exit(1);
    }
    process.exit(0);
}
main().catch((e) => {
    console.error('FATAL:', e);
    process.exit(2);
});
//# sourceMappingURL=verify-cam-integration.js.map