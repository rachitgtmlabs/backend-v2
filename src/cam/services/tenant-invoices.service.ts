import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { Lease, LeaseDocumentModel } from '../../lease/schemas/lease.schema';
import {
  CreateReminderDto,
  RecordPaymentDto,
} from '../dto/invoice-actions.dto';
import { Bill, BillDocumentModel } from '../schemas/bill.schema';
import {
  TenantInvoice,
  TenantInvoiceDocumentModel,
  TenantInvoiceKind,
  VarianceTag,
} from '../schemas/tenant-invoice.schema';
import { newReminderId } from '../utils/ids';

/**
 * Tenant Invoice service — read queries (Story 20) + payment (Story 21,
 * 22) + reminders (Story 27). Reconciliation runs build their adjustment
 * invoices via a different service; this one handles the day-to-day
 * ledger operations.
 */
@Injectable()
export class TenantInvoicesService {
  constructor(
    @InjectModel(TenantInvoice.name)
    private readonly model: Model<TenantInvoiceDocumentModel>,
    @InjectModel(Bill.name)
    private readonly billModel: Model<BillDocumentModel>,
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocumentModel>,
  ) {}

  // ── Ledger queries (Story 20, 22, 23) ────────────────────────────

  async list(filter: {
    portfolio_id: string;
    property_id?: string;
    unit_id?: string;
    calendar_year?: number;
    vendor_name?: string;
    expense_category?: string;
    variance_tag?: VarianceTag;
    invoice_kind?: TenantInvoiceKind;
    reconciled?: boolean; // committed && tenant_paid_amount != null
    limit?: number;
  }) {
    const q: FilterQuery<TenantInvoiceDocumentModel> = {
      portfolio_id: filter.portfolio_id,
    };
    if (filter.property_id) q.property_id = filter.property_id;
    if (filter.unit_id) q.unit_id = filter.unit_id;
    if (filter.calendar_year) q.calendar_year = filter.calendar_year;
    if (filter.expense_category) q.expense_category = filter.expense_category;
    if (filter.variance_tag) q.variance_tag = filter.variance_tag;
    if (filter.invoice_kind) q.invoice_kind = filter.invoice_kind;
    if (filter.reconciled === true) {
      q.status = 'committed';
      q.tenant_paid_amount = { $ne: null };
    } else if (filter.reconciled === false) {
      q.tenant_paid_amount = null;
    }

    const docs = await this.model
      .find(q)
      .sort({ committed_at: -1, createdAt: -1 })
      .limit(filter.limit ?? 500)
      .lean();

    const hydrated = await this.hydrateWithBills(docs);

    // vendor_name filter applied post-hydration (string contains, case-insensitive).
    if (filter.vendor_name) {
      const needle = filter.vendor_name.toLowerCase();
      return hydrated.filter((d) =>
        (d.bill_vendor_name ?? '').toLowerCase().includes(needle),
      );
    }
    return hydrated;
  }

  async getOne(portfolioId: string, invoiceId: string) {
    const doc = await this.model
      .findOne({ portfolio_id: portfolioId, invoiceId })
      .lean();
    if (!doc) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    const [hydrated] = await this.hydrateWithBills([doc]);
    return hydrated;
  }

  /**
   * Batch-load source Bills + per-unit leases for a set of invoices and
   * stamp `bill_invoice_date` + `bill_vendor_name` + `tenant_name` onto each
   * row.
   *
   * Tenant-name enrichment: invoice generation historically stored
   * `tenant_name: null` (the generator never joined leases — see the
   * Phase-4 TODO in invoice-generation.service.ts). To avoid a backfill,
   * we resolve it live here from the unit's latest processed lease,
   * reading `lease_information.leaseInformation.leaseTo.value`. If the
   * invoice already has a tenant_name (future invoices that snapshot it),
   * we respect that value.
   */
  private async hydrateWithBills(
    docs: Array<Record<string, any>>,
  ): Promise<Array<Record<string, any>>> {
    const billIds = Array.from(
      new Set(docs.map((d) => d.billId).filter((id): id is string => !!id)),
    );
    const unitIds = Array.from(
      new Set(docs.map((d) => d.unit_id).filter((id): id is string => !!id)),
    );

    // Bills lookup (existing behavior).
    const billsById = new Map<string, { invoice_date: Date | null; vendor_name: string | null }>();
    if (billIds.length > 0) {
      const bills = await this.billModel
        .find({ billId: { $in: billIds } })
        .select({ billId: 1, invoice_date: 1, vendor_name: 1 })
        .lean();
      for (const b of bills) {
        billsById.set(b.billId, {
          invoice_date: b.invoice_date ?? null,
          vendor_name: b.vendor_name ?? null,
        });
      }
    }

    // Latest-processed-lease-per-unit lookup for tenant_name fallback.
    const tenantNameByUnit = new Map<string, string | null>();
    if (unitIds.length > 0) {
      const leases = await this.leaseModel
        .find({
          unit_id: { $in: unitIds },
          status: 'processed',
        })
        .sort({ updatedAt: -1 })
        .select({ unit_id: 1, lease_information: 1 })
        .lean();
      for (const l of leases) {
        if (!l.unit_id || tenantNameByUnit.has(l.unit_id)) continue;
        tenantNameByUnit.set(l.unit_id, extractTenantName(l.lease_information));
      }
    }

    return docs.map((d) => {
      const b = d.billId ? billsById.get(d.billId) : undefined;
      const storedTenant =
        typeof d.tenant_name === 'string' && d.tenant_name.trim()
          ? d.tenant_name.trim()
          : null;
      const resolvedTenant =
        storedTenant ?? (d.unit_id ? tenantNameByUnit.get(d.unit_id) ?? null : null);
      return {
        ...d,
        bill_invoice_date: b?.invoice_date ?? null,
        bill_vendor_name: b?.vendor_name ?? null,
        tenant_name: resolvedTenant,
      };
    });
  }

  // ── Story 21 — payment entry + audit trail ─────────────────────

  async recordPayment(
    invoiceId: string,
    dto: RecordPaymentDto,
    actorFromCtx?: string,
  ) {
    const doc = await this.model.findOne({
      portfolio_id: dto.portfolio_id,
      invoiceId,
    });
    if (!doc) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (doc.status === 'void') {
      throw new BadRequestException(`Cannot record payment against voided invoice`);
    }
    const actor = dto.actor ?? actorFromCtx ?? 'unknown';
    const now = new Date();

    doc.payment_history.push({
      amount: dto.amount,
      paid_at: new Date(dto.paid_at),
      method: dto.method ?? null,
      reference: dto.reference ?? null,
      notes: dto.notes ?? null,
      recorded_by: actor,
      recorded_at: now,
    });
    doc.tenant_paid_amount = dto.amount;

    // Story 22 — variance tagging based on net amount.
    doc.variance_tag = computeVarianceTag(doc.invoice_amount, dto.amount);

    await doc.save();
    return toPayload(doc.toObject());
  }

  // ── Story 27 — reminders ────────────────────────────────────────

  async addReminder(invoiceId: string, dto: CreateReminderDto) {
    const doc = await this.model.findOne({
      portfolio_id: dto.portfolio_id,
      invoiceId,
    });
    if (!doc) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    doc.reminders.push({
      reminder_id: newReminderId(),
      user_id: dto.user_id,
      remind_at: new Date(dto.remind_at),
      note: dto.note ?? '',
      channel: dto.channel ?? 'in_app',
      fired_at: null,
    });
    await doc.save();
    return toPayload(doc.toObject());
  }

  async deleteReminder(
    invoiceId: string,
    reminderId: string,
    portfolioId: string,
    userId: string,
  ) {
    const doc = await this.model.findOne({
      portfolio_id: portfolioId,
      invoiceId,
    });
    if (!doc) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    const before = doc.reminders.length;
    doc.reminders = doc.reminders.filter(
      (r) => !(r.reminder_id === reminderId && r.user_id === userId),
    );
    if (doc.reminders.length === before) {
      throw new NotFoundException(`Reminder ${reminderId} not found for user`);
    }
    await doc.save();
    return { ok: true };
  }

  // ── Story 28 — list reminders due (read-only; cron fires events) ──

  async findDueReminders(now: Date = new Date(), limit = 200) {
    const docs = await this.model
      .find({
        'reminders.remind_at': { $lte: now },
        'reminders.fired_at': null,
      })
      .limit(limit)
      .lean();
    const out: Array<{
      invoiceId: string;
      reminder: {
        reminder_id: string;
        user_id: string;
        remind_at: Date;
        note: string;
        channel: string;
      };
      tenant_name: string | null;
      unit_id: string;
    }> = [];
    for (const d of docs) {
      for (const r of d.reminders ?? []) {
        if (r.fired_at == null && r.remind_at <= now) {
          out.push({
            invoiceId: d.invoiceId,
            unit_id: d.unit_id,
            tenant_name: d.tenant_name,
            reminder: {
              reminder_id: r.reminder_id,
              user_id: r.user_id,
              remind_at: r.remind_at,
              note: r.note ?? '',
              channel: r.channel ?? 'in_app',
            },
          });
        }
      }
    }
    return out;
  }

  async markReminderFired(invoiceId: string, reminderId: string) {
    await this.model.updateOne(
      { invoiceId, 'reminders.reminder_id': reminderId },
      { $set: { 'reminders.$.fired_at': new Date() } },
    );
  }
}

function computeVarianceTag(invoiced: number, paid: number): VarianceTag {
  const EPSILON = 0.005;
  if (Math.abs(paid - invoiced) <= EPSILON) return 'compliant';
  if (paid > invoiced) return 'over_billed';
  return 'under_billed';
}

function toPayload(d: Record<string, any>) {
  return d;
}

/**
 * Pull the tenant entity name out of the deeply-nested lease_information
 * shape the analyzer pipeline produces:
 *   lease_information.leaseInformation.leaseTo.value
 * Falls back to a legacy `tenant.value` if some old lease docs use that.
 * Returns null on any structural mismatch.
 */
function extractTenantName(info: unknown): string | null {
  const inner = (info as { leaseInformation?: Record<string, any> })
    ?.leaseInformation;
  if (!inner) return null;
  const candidate =
    typeof inner.leaseTo?.value === 'string' && inner.leaseTo.value.trim()
      ? String(inner.leaseTo.value).trim()
      : typeof inner.tenant?.value === 'string' && inner.tenant.value.trim()
        ? String(inner.tenant.value).trim()
        : null;
  return candidate;
}
