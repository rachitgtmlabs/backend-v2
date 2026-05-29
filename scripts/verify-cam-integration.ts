/**
 * CAM Phase 3 integration verification.
 *
 * End-to-end smoke test against a real MongoDB. Sets up an isolated
 * sandbox portfolio, runs the full bills → preview → commit → ledger →
 * payment → reconcile flow, and asserts the load-bearing math at each
 * step.
 *
 * Talks to mongoose directly + manually instantiates each service —
 * the Nest DI container isn't needed at runtime since the services
 * only depend on `Model<...>`. Matches the existing scripts/*.ts pattern.
 *
 *   npm run verify:cam-integration
 *
 * Requires MONGODB_URI. Cleans up after itself: sandbox docs are scoped
 * to a unique portfolio_id prefix and deleted on completion (success or
 * fail).
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import path from 'path';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import {
  Bill,
  BillSchema,
} from '../src/cam/schemas/bill.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../src/cam/schemas/expense-category.schema';
import {
  ReconciliationRun,
  ReconciliationRunSchema,
} from '../src/cam/schemas/reconciliation-run.schema';
import {
  TenantInvoice,
  TenantInvoiceSchema,
} from '../src/cam/schemas/tenant-invoice.schema';
import {
  UnitThreshold,
  UnitThresholdSchema,
} from '../src/cam/schemas/unit-threshold.schema';
import { Unit, UnitSchema } from '../src/unit/schemas/unit.schema';

import { BillsService } from '../src/cam/services/bills.service';
import { ExpenseCategoriesService } from '../src/cam/services/expense-categories.service';
import { ExpenseReportService } from '../src/cam/services/expense-report.service';
import { InvoiceGenerationService } from '../src/cam/services/invoice-generation.service';
import { ReconciliationService } from '../src/cam/services/reconciliation.service';
import { TenantInvoicesService } from '../src/cam/services/tenant-invoices.service';

import type { CamAllocationInput } from '../src/cam/engine';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri =
  process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';

const SANDBOX_TAG = `cam-itest-${Date.now()}-${randomBytes(3).toString('hex')}`;
const PORTFOLIO_ID = `por_${SANDBOX_TAG}`;
const PROPERTY_ID = `prp_${SANDBOX_TAG}`;

function approx(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 0.01) {
    throw new assert.AssertionError({
      message: `${label}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`,
      actual,
      expected,
    });
  }
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}` : String(e);
    console.log(`  ✗ ${name}`);
    console.log(`      ${msg}`);
    failures.push(`${name}: ${msg}`);
    failed += 1;
  }
}

async function main() {
  console.log(`Connecting to ${uri.replace(/\/\/[^@]*@/, '//***@')}`);
  await mongoose.connect(uri);
  console.log(`Sandbox: ${SANDBOX_TAG}\n`);

  // Register models on the default connection (matches Nest's runtime).
  const unitModel = mongoose.model(Unit.name, UnitSchema);
  const billModel = mongoose.model(Bill.name, BillSchema);
  const invModel = mongoose.model(TenantInvoice.name, TenantInvoiceSchema);
  const thrModel = mongoose.model(UnitThreshold.name, UnitThresholdSchema);
  const catModel = mongoose.model(
    ExpenseCategory.name,
    ExpenseCategorySchema,
  );
  const runModel = mongoose.model(
    ReconciliationRun.name,
    ReconciliationRunSchema,
  );

  // Manually instantiate services — the @Injectable() decorator is only
  // needed by Nest's DI container; at runtime they're plain classes.
  const bills = new BillsService(billModel as any);
  const cats = new ExpenseCategoriesService(catModel as any);
  const gen = new InvoiceGenerationService(
    billModel as any,
    unitModel as any,
    invModel as any,
    thrModel as any,
  );
  const invoices = new TenantInvoicesService(invModel as any);
  const recon = new ReconciliationService(
    billModel as any,
    unitModel as any,
    invModel as any,
    runModel as any,
  );
  const report = new ExpenseReportService(invModel as any);

  try {
    // ── Setup: seed 4 sandbox units with CAM allocations ─────────────
    const allocations: Array<{ unit_id: string; alloc: CamAllocationInput }> = [
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

    // Note: we intentionally do NOT seed a prior YTD threshold for
    // Subway here. Keeping threshold=0 makes the streaming commit equal
    // to the canonical replay (both process the same bills in
    // chronological order from zero), which is what lets the Reconcile
    // YYYY preview assertion of "delta == 0" hold.

    console.log('Phase 3 end-to-end flow');

    // ── Step 1: Bills creation ──────────────────────────────────────
    let bill1Id = '';
    let bill2Id = '';
    let bill3Id = '';
    let bill4Id = '';
    let txBillId = '';
    // Chronological order matters: bills are sorted by service_period_start
    // (= invoice_date here) before the engine processes them. Setup so
    // Subway's threshold crosses base on the Electricity bill (b1).
    //   t=0 → +Pest 480 → +Land 2840 → +Jan 1620 → +Elec 5482.40 (CROSSOVER)
    //   → +Tax 12000 (excluded, but still updates threshold)
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
      assert.equal(b1.status, 'extracted');
      assert.equal(b1.missing_fields.length, 0);
    });

    // ── Step 2: Accept all bills ────────────────────────────────────
    await step('2. Accept all 5 bills', async () => {
      for (const id of [bill1Id, bill2Id, bill3Id, bill4Id, txBillId]) {
        const r = await bills.transition(PORTFOLIO_ID, id, { to: 'accepted' });
        assert.equal(r.status, 'accepted');
      }
    });

    // ── Step 3: Preview ─────────────────────────────────────────────
    let previewSubwayCrossover = 0;
    await step('3. preview() — Subway crossover math matches locked algorithm', async () => {
      const result = await gen.preview({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
      });
      assert.equal(result.invoices.length, 20, '5 bills × 4 units = 20 invoices');

      const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
      const subwayElec = result.invoices.find(
        (i) => i.unit_id === subwayUnitId && i.billId === bill1Id,
      );
      assert.ok(subwayElec, 'Subway × Electricity invoice exists');
      assert.equal(subwayElec.case_type, 'crossover');
      // Chronological threshold path for Subway (base=8400, share=4.82%):
      //   0 → +480 → +2840 → +1620 → +5482.40 (= 10422.40 — CROSSOVER)
      //   threshold_before = 4940, threshold_after = 10422.40
      //   under = 8400 - 4940 = 3460; over = 10422.40 - 8400 = 2022.40
      //   billable = 2022.40 × 0.0482 = 97.48
      approx(subwayElec.invoice_amount, 97.48, 'Subway crossover billable');
      previewSubwayCrossover = subwayElec.invoice_amount;

      const subwayTx = result.invoices.find(
        (i) => i.unit_id === subwayUnitId && i.billId === txBillId,
      );
      assert.ok(subwayTx);
      assert.equal(subwayTx.case_type, 'excluded');
      assert.equal(subwayTx.invoice_amount, 0);
      assert.equal(subwayTx.is_excluded, true);
    });

    // ── Step 4: Commit ──────────────────────────────────────────────
    await step('4. commit() — persists invoices, updates thresholds, flips bills', async () => {
      const result = await gen.commit({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
      });
      assert.equal(result.invoices.length, 20);
      assert.equal(result.bills_committed, 5);
      assert.ok(result.threshold_writes > 0);

      const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
      const persisted: any = await invModel
        .findOne({
          unit_id: subwayUnitId,
          billId: bill1Id,
          property_id: PROPERTY_ID,
        })
        .lean();
      assert.ok(persisted);
      approx(persisted.invoice_amount, previewSubwayCrossover, 'preview == commit');
      assert.equal(persisted.status, 'committed');
      assert.equal(persisted.case_type, 'crossover');
    });

    await step('4b. commit() is idempotent on retry', async () => {
      const result = await gen.commit({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
      });
      assert.equal(result.invoices.length, 0, 'no new invoices on rerun');
    });

    // ── Step 5: Ledger query ────────────────────────────────────────
    await step('5. Ledger lists committed invoices, filterable by category', async () => {
      const all = await invoices.list({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
        calendar_year: 2026,
        invoice_kind: 'original',
      });
      assert.equal(all.length, 20);

      const electric = await invoices.list({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
        expense_category: 'Electricity',
        invoice_kind: 'original',
      });
      assert.equal(electric.length, 4);
    });

    // ── Step 6: Payment + variance ─────────────────────────────────
    let subwayInvoiceId = '';
    await step('6. Payment recorded → variance tags flip correctly', async () => {
      const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
      const list = await invoices.list({
        portfolio_id: PORTFOLIO_ID,
        unit_id: subwayUnitId,
        calendar_year: 2026,
      });
      const subway: any = list.find((i: any) => i.billId === bill1Id);
      assert.ok(subway);
      subwayInvoiceId = subway.invoiceId;

      const exact: any = await invoices.recordPayment(subwayInvoiceId, {
        portfolio_id: PORTFOLIO_ID,
        amount: subway.invoice_amount,
        paid_at: '2026-05-15',
        method: 'ACH',
      });
      assert.equal(exact.variance_tag, 'compliant');

      const under: any = await invoices.recordPayment(subwayInvoiceId, {
        portfolio_id: PORTFOLIO_ID,
        amount: subway.invoice_amount - 50,
        paid_at: '2026-05-20',
      });
      assert.equal(under.variance_tag, 'under_billed');
      assert.equal(under.payment_history.length, 2);
    });

    // ── Step 7: Reconcile preview — zero delta against own commit ───
    await step('7. Reconcile preview against own commit → zero delta', async () => {
      const result = await recon.run({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
        calendar_year: 2026,
        apply: false,
      });
      approx(result.diff.total_delta, 0, 'preview vs self == 0');
      assert.equal(result.adjustment_invoice_ids.length, 0);
      assert.equal(result.run.mode, 'preview');
    });

    // ── Step 8: Nudge + reconcile apply → adjustment invoice ────────
    await step('8. Nudge invoice + Reconcile apply → adjustment with line_items', async () => {
      const subwayUnitId = `unt_${SANDBOX_TAG}_u2`;
      const target: any = await invModel
        .findOne({
          unit_id: subwayUnitId,
          billId: bill2Id,
          invoice_kind: 'original',
        })
        .lean();
      assert.ok(target);

      const canonicalAmount = target.invoice_amount;
      await invModel.updateOne(
        { invoiceId: target.invoiceId },
        { $set: { invoice_amount: canonicalAmount - 25 } },
      );

      const result = await recon.run({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
        calendar_year: 2026,
        apply: true,
        actor: 'integration-test',
        apply_reason: 'Test adjustment',
      });
      assert.equal(result.run.mode, 'applied');
      assert.equal(result.adjustment_invoice_ids.length, 1);
      approx(result.diff.total_delta, 25, 'delta = +$25');

      const adjustment: any = await invModel
        .findOne({ invoiceId: result.adjustment_invoice_ids[0] })
        .lean();
      assert.equal(adjustment.invoice_kind, 'adjustment');
      assert.equal(adjustment.billId, null);
      assert.ok(adjustment.line_items.length > 0);
      approx(adjustment.invoice_amount, 25, 'adjustment = $25');
    });

    // ── Step 9: Expense report ──────────────────────────────────────
    await step('9. Expense report sums match per-category totals', async () => {
      const r = await report.reportByCategory({
        portfolio_id: PORTFOLIO_ID,
        property_id: PROPERTY_ID,
        calendar_year: 2026,
      });
      assert.ok(r.categories.length > 0);
      const sum = r.categories.reduce(
        (s: number, c: { total_invoiced: number }) => s + c.total_invoiced,
        0,
      );
      approx(sum, r.total_invoiced, 'category sum == total');
    });

    // ── Step 10: Custom category CRUD ───────────────────────────────
    await step('10. Custom category lifecycle (create/update/delete)', async () => {
      const created: any = await cats.createCustom({
        portfolio_id: PORTFOLIO_ID,
        name: `Sandbox-${SANDBOX_TAG}`,
        description: 'Integration test',
      });
      assert.equal(created.is_system, false);
      const list: any[] = await cats.listForPortfolio(PORTFOLIO_ID);
      assert.ok(list.some((c) => c.categoryId === created.categoryId));
      await cats.updateCustom(PORTFOLIO_ID, created.categoryId, {
        recoverable: false,
      });
      await cats.deleteCustom(PORTFOLIO_ID, created.categoryId);
    });
  } finally {
    // Always clean up sandbox docs.
    await unitModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await billModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await invModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await thrModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await catModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await runModel.deleteMany({ portfolio_id: PORTFOLIO_ID });
    await mongoose.disconnect();
  }

  console.log(`\n${passed} passed · ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});
