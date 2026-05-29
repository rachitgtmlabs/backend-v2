import type { InvoiceResult } from './types';

/**
 * Per-bill delta between what was actually invoiced and what the canonical
 * (chronological replay) said it should be.
 *
 * The optional display fields (vendor_name, expense_category, period_label)
 * are populated by the service layer for the Reconcile-YYYY diff UI; the
 * pure engine sets only the structural fields above them.
 */
export interface InvoiceLineDiff {
  billId: string;
  unit_id: string;
  original_invoice_id: string | null;
  original_invoiced_amount: number;
  canonical_invoiced_amount: number;
  delta: number;
  reason: string;

  /** "added" | "removed" | "modified" — line status the UI uses for badges. */
  status?: 'added' | 'removed' | 'modified';
  /** Display fields denormalized from the source Bill. */
  vendor_name?: string | null;
  expense_category?: string | null;
  /** "Mar 2026" / "Q2 2026" / "Jan 2026" — human-friendly service period. */
  period_label?: string | null;
}

/** Per-unit roll-up for the Reconcile YYYY diff view. */
export interface UnitDiff {
  unit_id: string;
  actual_invoiced_total: number;
  canonical_invoiced_total: number;
  delta: number;
  actual_threshold_eoy: number;
  canonical_threshold_eoy: number;
  lines: InvoiceLineDiff[];

  /** Display fields populated by the service layer. */
  unit_code?: string | null;
  tenant_name?: string | null;
}

export interface ReconDiff {
  total_delta: number;
  units_with_discrepancies: number;
  bills_affected: number;
  by_unit: UnitDiff[];

  /**
   * Populated by the service layer so the UI can show "X bills · Y invoices ·
   * Z net deltas" on the Replay-complete card without an extra API call.
   */
  bills_replayed?: number;
  canonical_invoices_count?: number;
  invoices_added?: number;
  invoices_modified?: number;
  invoices_removed?: number;
}

/**
 * Input shape for the "actual" side of the diff. We accept the minimal
 * fields the diff needs rather than full TenantInvoice documents so the
 * function stays pure / DB-free.
 */
export interface CommittedInvoiceLite {
  invoiceId: string;
  billId: string | null;
  unit_id: string;
  invoice_amount: number;
  threshold_after?: number | null;
}

/**
 * Diff a canonical replay result against the actually-committed invoices
 * for a given (property, calendar_year).
 *
 * Matching strategy:
 *   - Match by (billId, unit_id). Adjustment invoices have billId = null;
 *     they're excluded from the line-level diff (they're already corrections,
 *     including them would double-count).
 *   - A bill present in canonical but missing in actual → "missing" line
 *     (will become a positive adjustment).
 *   - A bill present in actual but missing in canonical → "extra" line
 *     (will become a negative adjustment; rare — usually means a manual
 *     invoice with no upstream bill).
 *   - Both present → "modified" if amounts differ within EPSILON, else
 *     "unchanged" and dropped from the lines list.
 */
export function diffInvoiceSets(
  canonical: readonly InvoiceResult[],
  actual: readonly CommittedInvoiceLite[],
): ReconDiff {
  const EPSILON = 0.005; // ½ cent — accounts for float drift, below billable precision

  // Index actuals by (billId, unit_id). Skip adjustments (billId=null) —
  // they're not part of the original-bill diff.
  const actualByKey = new Map<string, CommittedInvoiceLite>();
  for (const inv of actual) {
    if (inv.billId == null) continue;
    actualByKey.set(`${inv.billId}::${inv.unit_id}`, inv);
  }

  // Walk canonical, build per-unit groupings.
  const perUnit = new Map<string, UnitDiff>();
  const ensureUnit = (unitId: string): UnitDiff => {
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
      // Classify: actual=0 → added by canonical, canonical=0 → removed, else modified
      const status: 'added' | 'removed' | 'modified' =
        actualAmount === 0
          ? 'added'
          : can.invoice_amount === 0
            ? 'removed'
            : 'modified';
      u.lines.push({
        billId: can.billId,
        unit_id: can.unit_id,
        original_invoice_id: act?.invoiceId ?? null,
        original_invoiced_amount: actualAmount,
        canonical_invoiced_amount: can.invoice_amount,
        delta,
        status,
        reason: act
          ? `Recalculation differs by ${formatDelta(delta)}`
          : `Bill missing from ledger — canonical would have invoiced ${formatDelta(can.invoice_amount)}`,
      });
    }
  }

  // Anything left in actualByKey is "extra" — present in actual, not in canonical.
  for (const [, act] of actualByKey) {
    const u = ensureUnit(act.unit_id);
    u.actual_invoiced_total += act.invoice_amount;
    const delta = -act.invoice_amount; // canonical=0, actual=X → delta = -X
    if (Math.abs(delta) > EPSILON) {
      u.lines.push({
        billId: act.billId!,
        unit_id: act.unit_id,
        original_invoice_id: act.invoiceId,
        original_invoiced_amount: act.invoice_amount,
        canonical_invoiced_amount: 0,
        delta,
        status: 'removed',
        reason: `Ledger has invoice with no matching bill in canonical replay`,
      });
    }
  }

  // Finalize per-unit deltas
  const by_unit: UnitDiff[] = [];
  let totalDelta = 0;
  let unitsWithDiscrepancies = 0;
  const affectedBills = new Set<string>();
  for (const u of perUnit.values()) {
    u.delta = u.canonical_invoiced_total - u.actual_invoiced_total;
    if (Math.abs(u.delta) > EPSILON || u.lines.length > 0) {
      unitsWithDiscrepancies += 1;
    }
    totalDelta += u.delta;
    for (const l of u.lines) affectedBills.add(l.billId);
    by_unit.push(u);
  }

  // Stable order — alphabetical by unit_id keeps diffs reproducible
  by_unit.sort((a, b) => (a.unit_id < b.unit_id ? -1 : a.unit_id > b.unit_id ? 1 : 0));

  return {
    total_delta: totalDelta,
    units_with_discrepancies: unitsWithDiscrepancies,
    bills_affected: affectedBills.size,
    by_unit,
  };
}

function formatDelta(n: number): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
