import type {
  BillInput,
  CamAllocationInput,
  CaseType,
  InvoiceResult,
} from './types';

/**
 * Apply one bill to one unit's CAM rule, given the unit's threshold
 * BEFORE this bill arrives. Returns the engine result and the new
 * threshold value the caller must persist.
 *
 * This is the load-bearing function. Its behavior is locked per the
 * conversation:
 *
 *   1. threshold_after = threshold_before + bill.total_amount  (ALWAYS,
 *      even when the bill is excluded for this unit — the cushion gets
 *      consumed regardless).
 *   2. If bill.expense_category is in unit's exclusions:
 *        case = 'excluded', billable = 0.
 *   3. Else if threshold_after <= base_amount:
 *        case = 'pre_base', billable = 0, under_base_portion = bill.amount.
 *      (The "exactly at base" edge falls here, matching the JS source.)
 *   4. Else if threshold_before < base_amount AND threshold_after > base_amount:
 *        case = 'crossover'.
 *        under_base_portion = base_amount - threshold_before
 *        over_base_portion  = threshold_after - base_amount
 *        billable = over_base_portion * share_pct  (+ admin fee)
 *   5. Else: case = 'post_base'.
 *        over_base_portion = bill.total_amount
 *        billable = bill.total_amount * share_pct  (+ admin fee)
 *
 * Admin fee is applied to the billable portion after the share calculation:
 *   admin_fee = billable * admin_fee_pct
 *   final billable = billable + admin_fee
 *
 * Vacant units / null cam_allocation are NOT this function's concern —
 * the orchestrator filters them out before getting here.
 */
export function applyBillToUnit(
  bill: BillInput,
  unitId: string,
  rule: CamAllocationInput,
  thresholdBefore: number,
): InvoiceResult {
  const billAmount = bill.total_amount;
  const baseAmount = rule.base_amount;
  const sharePct = rule.share_pct;
  const adminFeePct = rule.admin_fee_pct ?? null;
  const exclusions = rule.exclusions ?? [];

  const thresholdAfter = thresholdBefore + billAmount;
  const isExcluded =
    bill.expense_category !== null &&
    exclusions.includes(bill.expense_category);

  let case_type: CaseType;
  let under_base_portion = 0;
  let over_base_portion = 0;
  let billable = 0;
  let admin_fee = 0;

  if (isExcluded) {
    case_type = 'excluded';
    // threshold still updates (see thresholdAfter above); billable stays 0.
  } else if (thresholdAfter <= baseAmount) {
    case_type = 'pre_base';
    under_base_portion = billAmount;
  } else if (thresholdBefore < baseAmount && thresholdAfter > baseAmount) {
    case_type = 'crossover';
    under_base_portion = baseAmount - thresholdBefore;
    over_base_portion = thresholdAfter - baseAmount;
    billable = over_base_portion * sharePct;
    if (adminFeePct !== null && adminFeePct > 0) {
      admin_fee = billable * adminFeePct;
      billable += admin_fee;
    }
  } else {
    case_type = 'post_base';
    over_base_portion = billAmount;
    billable = billAmount * sharePct;
    if (adminFeePct !== null && adminFeePct > 0) {
      admin_fee = billable * adminFeePct;
      billable += admin_fee;
    }
  }

  return {
    billId: bill.billId,
    unit_id: unitId,
    case_type,
    calendar_year: bill.calendar_year,

    bill_amount: billAmount,
    share_pct: sharePct,
    base_amount_at_time: baseAmount,
    base_year_at_time: rule.base_year,
    admin_fee_pct_at_time: adminFeePct,

    threshold_before: thresholdBefore,
    threshold_after: thresholdAfter,

    under_base_portion,
    over_base_portion,
    admin_fee,
    invoice_amount: billable,

    expense_category: bill.expense_category,
    applied_cam_rule_ids: rule.rule_ids ?? [],
    is_excluded: isExcluded,
  };
}
