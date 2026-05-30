import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Lease, LeaseDocumentModel } from '../../lease/schemas/lease.schema';
import { Unit, UnitDocumentModel } from '../../unit/schemas/unit.schema';
import {
  diffInvoiceSets,
  replayChronologically,
  type BillInput,
  type CommittedInvoiceLite,
  type ReconDiff,
  type UnitInput,
} from '../engine';
import { Bill, BillDocumentModel } from '../schemas/bill.schema';
import {
  ReconciliationRun,
  ReconciliationRunDocumentModel,
  ReconciliationRunMode,
} from '../schemas/reconciliation-run.schema';
import {
  AdjustmentLineItem,
  TenantInvoice,
  TenantInvoiceDocumentModel,
} from '../schemas/tenant-invoice.schema';
import { newInvoiceId, newReconRunId } from '../utils/ids';

/**
 * Reconcile YYYY service — the audit-reconcile feature.
 *
 *   run({ apply: false }) — PREVIEW. Pulls all committed/accepted bills for
 *     (property, year), replays the engine chronologically from threshold=0,
 *     diffs against actual committed invoices, returns a `ReconciliationRun`
 *     with mode='preview'. No invoices created. Safe to re-run.
 *
 *   run({ apply: true })  — APPLY. Same compute as preview, plus creates
 *     ONE adjustment invoice per affected unit, each with line_items[]
 *     embedded (one row per affected bill, per design (i)+(ii)).
 *     The run record mode flips to 'applied' and gets `adjustments_created`.
 *
 * Per Story 18 (no Delete), adjustments are append-only — re-running apply
 * doesn't modify prior adjustments; it produces NEW ones for any remaining
 * delta. In practice the second apply against unchanged data should be a
 * no-op (delta = 0 once first apply lands).
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectModel(Bill.name)
    private readonly billModel: Model<BillDocumentModel>,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocumentModel>,
    @InjectModel(TenantInvoice.name)
    private readonly invoiceModel: Model<TenantInvoiceDocumentModel>,
    @InjectModel(ReconciliationRun.name)
    private readonly runModel: Model<ReconciliationRunDocumentModel>,
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocumentModel>,
  ) {}

  async run(args: {
    portfolio_id: string;
    property_id: string;
    calendar_year: number;
    unit_id?: string;
    apply?: boolean;
    apply_reason?: string;
    actor?: string;
  }) {
    const { portfolio_id, property_id, calendar_year } = args;
    const apply = args.apply === true;

    // ── Load inputs ──────────────────────────────────────────────
    const unitDocs = await this.unitModel
      .find({
        portfolio_id,
        property_id,
        status: 'active',
        ...(args.unit_id ? { unitId: args.unit_id } : {}),
      })
      .lean();
    if (unitDocs.length === 0) {
      throw new NotFoundException(`No active units for property ${property_id}`);
    }

    const billDocs = await this.billModel
      .find({
        portfolio_id,
        property_id,
        status: { $in: ['accepted', 'committed'] },
      })
      .lean();
    const billsThisYear = billDocs.filter(
      (b) =>
        b.invoice_date != null &&
        b.invoice_date.getUTCFullYear() === calendar_year,
    );
    if (billsThisYear.length === 0) {
      throw new BadRequestException(
        `No bills for property ${property_id} in ${calendar_year}`,
      );
    }

    const invoiceDocs = await this.invoiceModel
      .find({
        portfolio_id,
        property_id,
        calendar_year,
        invoice_kind: 'original',
        status: { $in: ['committed', 'draft'] },
        ...(args.unit_id ? { unit_id: args.unit_id } : {}),
      })
      .lean();

    // ── Convert to engine inputs ────────────────────────────────
    const bills: BillInput[] = billsThisYear
      .filter(
        (b): b is typeof b & { total_amount: number } =>
          b.total_amount !== null,
      )
      .map((b) => ({
        billId: b.billId,
        total_amount: b.total_amount,
        expense_category: b.expense_category ?? null,
        calendar_year,
        service_period_start: b.service_period_start ?? b.invoice_date ?? null,
      }));

    // Resolve tenant_name per unit up-front so the engine input AND the
    // downstream invoice/run docs all see the same source-of-truth value
    // (the unit's latest processed lease).
    const tenantsByUnitId = await this.resolveTenantNamesForUnits(
      unitDocs.map((u) => u.unitId),
    );

    const units: UnitInput[] = unitDocs.map((u) => ({
      unit_id: u.unitId,
      unit_code: u.unit_code ?? null,
      tenant_name: tenantsByUnitId.get(u.unitId) ?? null,
      occupancy_status: (u.occupancy_status ?? 'occupied') as
        | 'occupied'
        | 'vacant',
      cam_allocation: u.cam_allocation
        ? {
            base_amount: u.cam_allocation.base_amount,
            base_year: u.cam_allocation.base_year,
            share_pct: u.cam_allocation.share_pct,
            exclusions: u.cam_allocation.exclusions ?? [],
            admin_fee_pct: u.cam_allocation.admin_fee_pct ?? null,
            rule_ids: u.cam_allocation.rule_ids ?? [],
            rule_name: u.cam_allocation.rule_name ?? '',
          }
        : null,
    }));

    // ── Replay + diff ────────────────────────────────────────────
    const canonical = replayChronologically(bills, units);
    const actualLite: CommittedInvoiceLite[] = invoiceDocs.map((i) => ({
      invoiceId: i.invoiceId,
      billId: i.billId ?? null,
      unit_id: i.unit_id,
      invoice_amount: i.invoice_amount,
      threshold_after: i.threshold_after ?? null,
    }));
    const diff = diffInvoiceSets(canonical.invoices, actualLite);

    // ── Enrich diff with display fields for the Reconcile-YYYY UI ────
    // The engine module stays pure; the service decorates lines + units
    // with denormalized vendor / category / period / unit_code / tenant_name
    // so the per-unit accordion can render without a follow-up round trip.
    const billById = new Map(billsThisYear.map((b) => [b.billId, b]));
    const unitCodeByUnit = new Map(unitDocs.map((u) => [u.unitId, u.unit_code]));
    // Reuse the tenant-name map resolved earlier from leases — same lookup,
    // no second round-trip.
    const tenantNameByUnit = tenantsByUnitId;

    let invoicesAdded = 0;
    let invoicesModified = 0;
    let invoicesRemoved = 0;
    for (const u of diff.by_unit) {
      u.unit_code = unitCodeByUnit.get(u.unit_id) ?? null;
      u.tenant_name = tenantNameByUnit.get(u.unit_id) ?? null;
      for (const l of u.lines) {
        const bill = billById.get(l.billId);
        l.vendor_name = bill?.vendor_name ?? null;
        l.expense_category = bill?.expense_category ?? null;
        l.period_label = formatPeriodLabel(
          bill?.service_period_start ?? bill?.invoice_date ?? null,
        );
        if (l.status === 'added') invoicesAdded += 1;
        else if (l.status === 'removed') invoicesRemoved += 1;
        else if (l.status === 'modified') invoicesModified += 1;
      }
    }
    diff.bills_replayed = bills.length;
    diff.canonical_invoices_count = canonical.invoices.length;
    diff.invoices_added = invoicesAdded;
    diff.invoices_modified = invoicesModified;
    diff.invoices_removed = invoicesRemoved;

    // ── Persist the run record ──────────────────────────────────
    const now = new Date();

    const adjustmentInvoiceIdsByUnit = new Map<string, string>();
    if (apply) {
      // Create one adjustment invoice per unit with non-zero delta.
      for (const u of diff.by_unit) {
        if (Math.abs(u.delta) < 0.005 || u.lines.length === 0) continue;

        const lineItems: AdjustmentLineItem[] = u.lines.map((l) => {
          const billDoc = billsThisYear.find((b) => b.billId === l.billId);
          return {
            billId: l.billId,
            bill_vendor_name: billDoc?.vendor_name ?? null,
            bill_invoice_date: billDoc?.invoice_date ?? null,
            bill_total_amount: billDoc?.total_amount ?? null,
            original_invoice_id: l.original_invoice_id,
            original_invoiced_amount: l.original_invoiced_amount,
            canonical_invoiced_amount: l.canonical_invoiced_amount,
            delta: l.delta,
            reason: l.reason,
          };
        });

        const adjustment = await this.invoiceModel.create({
          invoiceId: newInvoiceId(),
          invoice_kind: 'adjustment',
          billId: null,
          unit_id: u.unit_id,
          property_id,
          portfolio_id,
          unit_code: unitCodeByUnit.get(u.unit_id) ?? null,
          tenant_name: tenantsByUnitId.get(u.unit_id) ?? null,
          bill_amount: null,
          share_pct: null,
          base_amount_at_time: null,
          base_year_at_time: null,
          admin_fee_pct_at_time: null,
          threshold_before: null,
          threshold_after: null,
          under_base_portion: 0,
          over_base_portion: 0,
          admin_fee: 0,
          invoice_amount: u.delta,
          case_type: null,
          calendar_year,
          expense_category: null,
          applied_cam_rule_ids: [],
          status: 'committed',
          committed_at: now,
          committed_by: args.actor ?? null,
          tenant_paid_amount: null,
          variance_tag: null,
          payment_history: [],
          reminders: [],
          line_items: lineItems,
        });
        adjustmentInvoiceIdsByUnit.set(u.unit_id, adjustment.invoiceId);
      }
    }

    const mode: ReconciliationRunMode = apply ? 'applied' : 'preview';
    const runDoc = await this.runModel.create({
      runId: newReconRunId(),
      property_id,
      portfolio_id,
      unit_id: args.unit_id ?? null,
      calendar_year,
      mode,
      triggered_by: args.actor ?? 'unknown',
      triggered_at: now,
      total_delta: diff.total_delta,
      units_with_discrepancies: diff.units_with_discrepancies,
      bills_affected: diff.bills_affected,
      by_unit: diff.by_unit.map((u) => ({
        unit_id: u.unit_id,
        unit_code: unitCodeByUnit.get(u.unit_id) ?? null,
        tenant_name: tenantsByUnitId.get(u.unit_id) ?? null,
        actual_invoiced_total: u.actual_invoiced_total,
        canonical_invoiced_total: u.canonical_invoiced_total,
        delta: u.delta,
        actual_threshold_eoy: u.actual_threshold_eoy,
        canonical_threshold_eoy: u.canonical_threshold_eoy,
        adjustment_invoiceId: adjustmentInvoiceIdsByUnit.get(u.unit_id) ?? null,
      })),
      adjustments_created: Array.from(adjustmentInvoiceIdsByUnit.values()),
      applied_at: apply ? now : null,
      applied_by: apply ? args.actor ?? null : null,
      apply_reason: apply ? args.apply_reason ?? null : null,
    });

    return {
      run: runDoc.toObject(),
      diff,
      adjustment_invoice_ids: Array.from(adjustmentInvoiceIdsByUnit.values()),
    };
  }

  async listRuns(filter: {
    portfolio_id: string;
    property_id?: string;
    calendar_year?: number;
    mode?: ReconciliationRunMode;
    limit?: number;
  }) {
    const q: Record<string, unknown> = { portfolio_id: filter.portfolio_id };
    if (filter.property_id) q.property_id = filter.property_id;
    if (filter.calendar_year) q.calendar_year = filter.calendar_year;
    if (filter.mode) q.mode = filter.mode;
    return this.runModel
      .find(q)
      .sort({ triggered_at: -1 })
      .limit(filter.limit ?? 50)
      .lean();
  }

  async getRun(portfolioId: string, runId: string) {
    const doc = await this.runModel
      .findOne({ portfolio_id: portfolioId, runId })
      .lean();
    if (!doc) throw new NotFoundException(`Reconciliation run ${runId} not found`);
    return doc;
  }

  /**
   * Build unit_id → tenant_name from each unit's latest processed lease.
   * Reads `lease_information.leaseInformation.leaseTo.value`. Used to
   * snapshot tenant_name onto adjustment invoices and recon-run docs.
   */
  private async resolveTenantNamesForUnits(
    unitIds: readonly string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (unitIds.length === 0) return result;
    const leases = await this.leaseModel
      .find({
        unit_id: { $in: [...unitIds] },
        status: 'processed',
      })
      .sort({ updatedAt: -1 })
      .select({ unit_id: 1, lease_information: 1 })
      .lean();
    for (const l of leases) {
      if (!l.unit_id || result.has(l.unit_id)) continue;
      const inner = (l.lease_information as { leaseInformation?: Record<string, any> })
        ?.leaseInformation;
      const name =
        (typeof inner?.leaseTo?.value === 'string' && inner.leaseTo.value.trim()) ||
        (typeof inner?.tenant?.value === 'string' && inner.tenant.value.trim()) ||
        null;
      if (name) result.set(l.unit_id, name);
    }
    return result;
  }
}

/** "Mar 2026" if a single month is implied, "Q1 2026" if it spans a quarter. */
function formatPeriodLabel(d: Date | null | undefined): string | null {
  if (!d) return null;
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}
