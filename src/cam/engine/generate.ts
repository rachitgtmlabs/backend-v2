import { applyBillToUnit } from './apply-bill';
import {
  type BillInput,
  type GenerateOptions,
  type GenerateResult,
  type InvoiceResult,
  type ThresholdMap,
  type UnitInput,
  thresholdKey,
} from './types';

/**
 * Orchestrator: take a list of bills and a list of units, produce the full
 * set of invoices and the updated per-(unit, year) threshold map.
 *
 * Streaming variant (default): processes bills in the order given. This is
 * what the wizard's "Generate Invoices" trigger calls (Story 15) — bills
 * are accepted by the user one batch at a time and the order matters
 * operationally (but is order-dependent, which is an accepted trade-off
 * with the user-triggered Reconcile YYYY as the canonical resolver).
 *
 * Chronological variant: pass `ordering: 'chronological'` and the bills
 * get sorted by service_period_start before processing. Used by
 * `replayChronologically()` for the Reconcile YYYY feature.
 *
 * Units are filtered down to the eligible set:
 *  - status='active' (archived units skip)
 *  - occupancy_status='occupied' (vacant units skip)
 *  - cam_allocation !== null (unconfigured units skip)
 */
export function generateInvoicesForBatch(
  bills: readonly BillInput[],
  units: readonly UnitInput[],
  options: GenerateOptions = {},
): GenerateResult {
  const orderedBills =
    options.ordering === 'chronological' ? sortChronologically(bills) : [...bills];

  // Defensive copy so caller's threshold map isn't mutated.
  const thresholds: ThresholdMap = {
    ...(options.ordering === 'chronological'
      ? {}
      : options.initial_thresholds ?? {}),
  };
  const appliedBillIds = options.applied_bill_ids ?? new Set<string>();

  const eligibleUnits = units.filter(
    (u) => u.occupancy_status === 'occupied' && u.cam_allocation !== null,
  );

  const invoices: InvoiceResult[] = [];
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
      // cam_allocation is non-null because of the filter above; assert for TS.
      const rule = unit.cam_allocation!;
      const key = thresholdKey(unit.unit_id, bill.calendar_year);
      const thresholdBefore = thresholds[key] ?? 0;

      const result = applyBillToUnit(bill, unit.unit_id, rule, thresholdBefore);
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

function sortChronologically(bills: readonly BillInput[]): BillInput[] {
  return [...bills].sort((a, b) => {
    const aDate = toComparable(a.service_period_start);
    const bDate = toComparable(b.service_period_start);
    if (aDate < bDate) return -1;
    if (aDate > bDate) return 1;
    // Stable secondary key: billId, so reorderings within the same date
    // are deterministic across runs.
    return a.billId < b.billId ? -1 : a.billId > b.billId ? 1 : 0;
  });
}

function toComparable(d: Date | string | null | undefined): string {
  if (d == null) return '';
  if (d instanceof Date) return d.toISOString();
  return d;
}
