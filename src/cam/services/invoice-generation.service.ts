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
  applyBillToUnit,
  generateInvoicesForBatch,
  type BillInput,
  type GenerateResult,
  type InvoiceResult,
  type UnitInput,
} from '../engine';
import { Bill, BillDocumentModel } from '../schemas/bill.schema';
import {
  TenantInvoice,
  TenantInvoiceDocumentModel,
} from '../schemas/tenant-invoice.schema';
import {
  UnitThreshold,
  UnitThresholdDocumentModel,
} from '../schemas/unit-threshold.schema';
import { newInvoiceId, newThresholdId } from '../utils/ids';

/**
 * Invoice Generation service — Stories 15–19.
 *
 *   preview()  — runs the engine against accepted bills for a property,
 *                 returning what invoices *would* be created. Reads YTD
 *                 thresholds; does NOT write anything. Backs the
 *                 "Generate Invoices" review screen.
 *
 *   commit()   — Story 19. Re-runs the engine atomically against the same
 *                 accepted bills, this time PERSISTING draft TenantInvoices,
 *                 updating UnitThreshold YTD counters, and flipping the
 *                 source bills to `committed`. The engine call uses the
 *                 idempotency guard against (billId × unit) tuples already
 *                 present in tenant_invoices so re-running is safe.
 *
 * IMPORTANT — the engine math is NOT touched here. This service is a
 * thin adapter: read inputs → call engine → write outputs.
 */
@Injectable()
export class InvoiceGenerationService {
  private readonly logger = new Logger(InvoiceGenerationService.name);

  constructor(
    @InjectModel(Bill.name)
    private readonly billModel: Model<BillDocumentModel>,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocumentModel>,
    @InjectModel(TenantInvoice.name)
    private readonly invoiceModel: Model<TenantInvoiceDocumentModel>,
    @InjectModel(UnitThreshold.name)
    private readonly thresholdModel: Model<UnitThresholdDocumentModel>,
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocumentModel>,
  ) {}

  /**
   * Read accepted bills + occupied units + current YTD thresholds for a
   * property and (optional) session. Returns the engine output verbatim
   * plus a denormalized payload the UI can render. No DB writes.
   */
  async preview(args: {
    portfolio_id: string;
    property_id: string;
    session_id?: string;
  }): Promise<{
    invoices: PreviewInvoice[];
    stats: GenerateResult['stats'];
    threshold_deltas: ThresholdDelta[];
  }> {
    const { bills, units, thresholdsByKey } = await this.loadInputs(args);
    if (bills.length === 0) {
      // Preview is user-initiated — empty input is a user error.
      throw new BadRequestException(
        `No accepted bills to preview for property=${args.property_id}` +
          (args.session_id ? ` session=${args.session_id}` : ''),
      );
    }

    const result = generateInvoicesForBatch(bills, units, {
      initial_thresholds: Object.fromEntries(thresholdsByKey),
    });

    return {
      invoices: result.invoices.map((i) =>
        this.toPreviewInvoice(i, args.portfolio_id, args.property_id, units),
      ),
      stats: result.stats,
      threshold_deltas: this.computeThresholdDeltas(
        thresholdsByKey,
        result.final_thresholds,
        result.invoices,
      ),
    };
  }

  /**
   * Story 19 — commit. Generates drafts and immediately moves them to
   * committed (the UX's commit modal already confirmed). Returns the
   * persisted documents.
   *
   * Idempotency: skips bills that already have invoices for this property's
   * occupied units (matched on billId × unit_id × calendar_year). Lets the
   * caller hit retry safely.
   */
  async commit(args: {
    portfolio_id: string;
    property_id: string;
    session_id?: string;
    actor?: string;
  }): Promise<{
    invoices: TenantInvoicePayload[];
    bills_committed: number;
    threshold_writes: number;
    stats: GenerateResult['stats'];
  }> {
    const { bills, units, thresholdsByKey } = await this.loadInputs(args);
    // Commit is idempotent — second invocation after a successful commit
    // has no accepted bills, so we return a zero-result rather than 400.
    if (bills.length === 0) {
      return {
        invoices: [],
        bills_committed: 0,
        threshold_writes: 0,
        stats: {
          bills_processed: 0,
          bills_skipped: 0,
          units_processed: 0,
          invoices_produced: 0,
          invoices_with_billable_gt_zero: 0,
          invoices_excluded: 0,
          invoices_crossover: 0,
        },
      };
    }

    // Find existing (billId, unit_id) pairs to skip — idempotency guard.
    const billIds = bills.map((b) => b.billId);
    const existingInvoices = await this.invoiceModel
      .find({
        billId: { $in: billIds },
        property_id: args.property_id,
        portfolio_id: args.portfolio_id,
        invoice_kind: 'original',
      })
      .lean();
    const existingKeys = new Set(
      existingInvoices.map(
        (i) => `${String(i.billId)}::${String(i.unit_id)}::${i.calendar_year}`,
      ),
    );

    const result = generateInvoicesForBatch(bills, units, {
      initial_thresholds: Object.fromEntries(thresholdsByKey),
    });

    const newInvoices = result.invoices.filter(
      (r) => !existingKeys.has(`${r.billId}::${r.unit_id}::${r.calendar_year}`),
    );

    const now = new Date();
    const docs = newInvoices.map((r) => {
      const unit = units.find((u) => u.unit_id === r.unit_id);
      return {
        invoiceId: newInvoiceId(),
        invoice_kind: 'original' as const,
        billId: r.billId,
        unit_id: r.unit_id,
        property_id: args.property_id,
        portfolio_id: args.portfolio_id,
        unit_code: unit?.unit_code ?? null,
        tenant_name: unit?.tenant_name ?? null,
        bill_amount: r.bill_amount,
        share_pct: r.share_pct,
        base_amount_at_time: r.base_amount_at_time,
        base_year_at_time: r.base_year_at_time,
        admin_fee_pct_at_time: r.admin_fee_pct_at_time,
        threshold_before: r.threshold_before,
        threshold_after: r.threshold_after,
        under_base_portion: r.under_base_portion,
        over_base_portion: r.over_base_portion,
        admin_fee: r.admin_fee,
        invoice_amount: r.invoice_amount,
        case_type: r.case_type,
        calendar_year: r.calendar_year,
        expense_category: r.expense_category,
        applied_cam_rule_ids: r.applied_cam_rule_ids,
        status: 'committed' as const,
        committed_at: now,
        committed_by: args.actor ?? null,
        tenant_paid_amount: null,
        variance_tag: null,
        payment_history: [],
        reminders: [],
      };
    });

    if (docs.length > 0) {
      await this.invoiceModel.insertMany(docs, { ordered: false });
    }

    // Persist updated YTD thresholds (only for keys that actually moved).
    // We iterate the engine's invoices (which carry unit_id + calendar_year
    // explicitly) rather than parsing the threshold-map key — unit IDs can
    // contain hyphens, so `key.split('-')` is unsafe.
    const updatedKeys = new Set<string>();
    let thresholdWrites = 0;
    for (const inv of result.invoices) {
      const key = `${inv.unit_id}-${inv.calendar_year}`;
      if (updatedKeys.has(key)) continue;
      updatedKeys.add(key);

      const before = thresholdsByKey.get(key) ?? 0;
      const after = result.final_thresholds[key] ?? before;
      if (Math.abs(after - before) < 0.0005) continue;

      const billsForKey = result.invoices.filter(
        (r) =>
          r.unit_id === inv.unit_id &&
          r.calendar_year === inv.calendar_year &&
          !existingKeys.has(
            `${r.billId}::${inv.unit_id}::${inv.calendar_year}`,
          ),
      );
      const lastBill = billsForKey[billsForKey.length - 1];

      await this.thresholdModel.findOneAndUpdate(
        { unit_id: inv.unit_id, calendar_year: inv.calendar_year },
        {
          $setOnInsert: {
            thresholdId: newThresholdId(),
            unit_id: inv.unit_id,
            calendar_year: inv.calendar_year,
            portfolio_id: args.portfolio_id,
            property_id: args.property_id,
          },
          $set: {
            threshold_amount: after,
            last_bill_id: lastBill?.billId ?? null,
          },
          $inc: { bills_applied_count: billsForKey.length },
        },
        { upsert: true, new: true },
      );
      thresholdWrites += 1;
    }

    // Mark the source bills committed.
    const committedBillIds = Array.from(
      new Set(newInvoices.map((r) => r.billId)),
    );
    const billsCommitted = await this.markBillsCommitted(
      args.portfolio_id,
      committedBillIds,
    );

    const persistedInvoices = docs.map(toInvoicePayload);

    return {
      invoices: persistedInvoices,
      bills_committed: billsCommitted,
      threshold_writes: thresholdWrites,
      stats: result.stats,
    };
  }

  // ── Internals ────────────────────────────────────────────────────

  private async loadInputs(args: {
    portfolio_id: string;
    property_id: string;
    session_id?: string;
  }): Promise<{
    bills: BillInput[];
    units: UnitInput[];
    thresholdsByKey: Map<string, number>;
  }> {
    const billQuery: Record<string, unknown> = {
      portfolio_id: args.portfolio_id,
      property_id: args.property_id,
      status: 'accepted',
    };
    if (args.session_id) billQuery.session_id = args.session_id;

    const billDocs = await this.billModel.find(billQuery).lean();
    // No-bill case is handled by callers (preview throws, commit no-ops).

    const unitDocs = await this.unitModel
      .find({
        portfolio_id: args.portfolio_id,
        property_id: args.property_id,
        status: 'active',
      })
      .lean();
    if (unitDocs.length === 0) {
      throw new NotFoundException(
        `No active units found for property ${args.property_id}`,
      );
    }

    const bills: BillInput[] = billDocs
      .filter(
        (b): b is typeof b & { total_amount: number; invoice_date: Date } =>
          b.total_amount !== null && b.invoice_date !== null,
      )
      .map((b) => ({
        billId: b.billId,
        total_amount: b.total_amount,
        expense_category: b.expense_category ?? null,
        calendar_year: b.invoice_date.getUTCFullYear(),
        service_period_start: b.service_period_start ?? b.invoice_date,
      }))
      // Sort bills chronologically before handing to the engine. Makes
      // single-batch streaming runs match the canonical chronological
      // replay (so a fresh Reconcile YYYY against a clean commit shows
      // zero delta). Cross-batch order-dependence still exists; that's
      // what Reconcile YYYY catches.
      .sort((a, b) => {
        const aT = a.service_period_start
          ? a.service_period_start instanceof Date
            ? a.service_period_start.toISOString()
            : a.service_period_start
          : '';
        const bT = b.service_period_start
          ? b.service_period_start instanceof Date
            ? b.service_period_start.toISOString()
            : b.service_period_start
          : '';
        if (aT < bT) return -1;
        if (aT > bT) return 1;
        return a.billId < b.billId ? -1 : 1;
      });

    // Resolve tenant_name per unit from the latest processed lease so it
    // can be snapshotted onto each new TenantInvoice doc. The engine itself
    // doesn't need this for math — it's purely for display + audit.
    const tenantNameByUnit = await this.resolveTenantNamesForUnits(
      unitDocs.map((u) => u.unitId),
    );

    const units: UnitInput[] = unitDocs.map((u) => ({
      unit_id: u.unitId,
      unit_code: u.unit_code ?? null,
      tenant_name: tenantNameByUnit.get(u.unitId) ?? null,
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

    const years = Array.from(new Set(bills.map((b) => b.calendar_year)));
    const thresholdDocs = await this.thresholdModel
      .find({
        property_id: args.property_id,
        calendar_year: { $in: years },
      })
      .lean();
    const thresholdsByKey = new Map<string, number>();
    for (const t of thresholdDocs) {
      thresholdsByKey.set(`${t.unit_id}-${t.calendar_year}`, t.threshold_amount);
    }

    return { bills, units, thresholdsByKey };
  }

  /**
   * Build a unit_id → tenant_name map from each unit's latest processed
   * lease. Reads `lease_information.leaseInformation.leaseTo.value`.
   * Units without a lease (or with `leaseTo` missing) map to undefined.
   * Used to snapshot tenant_name onto TenantInvoice docs at commit time.
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

  private async markBillsCommitted(
    portfolioId: string,
    billIds: readonly string[],
  ): Promise<number> {
    if (billIds.length === 0) return 0;
    const res = await this.billModel.updateMany(
      {
        portfolio_id: portfolioId,
        billId: { $in: [...billIds] },
        status: 'accepted',
      },
      { $set: { status: 'committed' } },
    );
    return res.modifiedCount ?? 0;
  }

  private toPreviewInvoice(
    r: InvoiceResult,
    portfolioId: string,
    propertyId: string,
    units: UnitInput[],
  ): PreviewInvoice {
    const unit = units.find((u) => u.unit_id === r.unit_id);
    return {
      billId: r.billId,
      unit_id: r.unit_id,
      unit_code: unit?.unit_code ?? null,
      property_id: propertyId,
      portfolio_id: portfolioId,
      case_type: r.case_type,
      calendar_year: r.calendar_year,
      bill_amount: r.bill_amount,
      share_pct: r.share_pct,
      base_amount_at_time: r.base_amount_at_time,
      base_year_at_time: r.base_year_at_time,
      admin_fee_pct_at_time: r.admin_fee_pct_at_time,
      threshold_before: r.threshold_before,
      threshold_after: r.threshold_after,
      under_base_portion: r.under_base_portion,
      over_base_portion: r.over_base_portion,
      admin_fee: r.admin_fee,
      invoice_amount: r.invoice_amount,
      expense_category: r.expense_category,
      applied_cam_rule_ids: r.applied_cam_rule_ids,
      is_excluded: r.is_excluded,
    };
  }

  private computeThresholdDeltas(
    before: Map<string, number>,
    after: Record<string, number>,
    invoices: InvoiceResult[],
  ): ThresholdDelta[] {
    // Walk invoices to recover (unit_id, year) safely — unit_ids may
    // contain hyphens so we can't parse the composite key.
    const seen = new Set<string>();
    const out: ThresholdDelta[] = [];
    for (const inv of invoices) {
      const key = `${inv.unit_id}-${inv.calendar_year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const prev = before.get(key) ?? 0;
      const value = after[key] ?? prev;
      if (Math.abs(value - prev) < 0.0005) continue;
      out.push({
        unit_id: inv.unit_id,
        calendar_year: inv.calendar_year,
        threshold_before: prev,
        threshold_after: value,
        delta: value - prev,
      });
    }
    return out;
  }

  /** Helper used by the verification script — exposes single-bill apply. */
  applyBillToUnitDebug = applyBillToUnit;
}

export interface PreviewInvoice extends Omit<InvoiceResult, 'is_excluded'> {
  unit_code: string | null;
  property_id: string;
  portfolio_id: string;
  is_excluded: boolean;
}

export interface ThresholdDelta {
  unit_id: string;
  calendar_year: number;
  threshold_before: number;
  threshold_after: number;
  delta: number;
}

export interface TenantInvoicePayload {
  invoiceId: string;
  unit_id: string;
  billId: string | null;
  invoice_amount: number;
  case_type: string | null;
  calendar_year: number;
}

function toInvoicePayload(d: {
  invoiceId: string;
  unit_id: string;
  billId: string;
  invoice_amount: number;
  case_type: string;
  calendar_year: number;
}): TenantInvoicePayload {
  return {
    invoiceId: d.invoiceId,
    unit_id: d.unit_id,
    billId: d.billId,
    invoice_amount: d.invoice_amount,
    case_type: d.case_type,
    calendar_year: d.calendar_year,
  };
}
