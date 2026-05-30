"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBillToUnit = applyBillToUnit;
function applyBillToUnit(bill, unitId, rule, thresholdBefore) {
    const billAmount = bill.total_amount;
    const baseAmount = rule.base_amount;
    const sharePct = rule.share_pct;
    const adminFeePct = rule.admin_fee_pct ?? null;
    const exclusions = rule.exclusions ?? [];
    const thresholdAfter = thresholdBefore + billAmount;
    const isExcluded = bill.expense_category !== null &&
        exclusions.includes(bill.expense_category);
    let case_type;
    let under_base_portion = 0;
    let over_base_portion = 0;
    let billable = 0;
    let admin_fee = 0;
    if (isExcluded) {
        case_type = 'excluded';
    }
    else if (thresholdAfter <= baseAmount) {
        case_type = 'pre_base';
        under_base_portion = billAmount;
    }
    else if (thresholdBefore < baseAmount && thresholdAfter > baseAmount) {
        case_type = 'crossover';
        under_base_portion = baseAmount - thresholdBefore;
        over_base_portion = thresholdAfter - baseAmount;
        billable = over_base_portion * sharePct;
        if (adminFeePct !== null && adminFeePct > 0) {
            admin_fee = billable * adminFeePct;
            billable += admin_fee;
        }
    }
    else {
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
//# sourceMappingURL=apply-bill.js.map