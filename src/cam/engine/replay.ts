import { generateInvoicesForBatch } from './generate';
import type { BillInput, GenerateResult, UnitInput } from './types';

/**
 * Chronological replay for the Reconcile YYYY feature (Property Ledger).
 *
 * Takes ALL bills for a property × calendar-year (typically pulled from
 * the bills collection with status in {accepted, committed}), sorts them
 * by `service_period_start`, and runs the engine from threshold = 0.
 *
 * The result is the "canonical" set of invoices — what the ledger
 * *would* contain if every bill had arrived in service-date order. The
 * caller diffs this against the actual committed invoices (see
 * `diffInvoiceSets`) to produce adjustment invoices.
 *
 * Note: we DO NOT pass `initial_thresholds` — replay always starts at
 * zero (it's the whole point — order-independent canonical view).
 */
export function replayChronologically(
  bills: readonly BillInput[],
  units: readonly UnitInput[],
): GenerateResult {
  return generateInvoicesForBatch(bills, units, {
    ordering: 'chronological',
    initial_thresholds: {},
  });
}
