import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import {
  COMPULSORY_BILL_FIELDS,
  CreateBillDto,
  TransitionBillDto,
  UpdateBillDto,
} from '../dto/bill.dto';
import { Bill, BillDocumentModel, BillStatus } from '../schemas/bill.schema';
import { newBillId, newSessionId } from '../utils/ids';

/**
 * Bills service — Stories 3, 7 (sans file upload), 11–14.
 *
 * The OCR / multi-bill PDF split (Stories 8, 10) are deferred to a later
 * phase; bills land here either via OCR pipeline (when wired) or via
 * manual create from the UI's "incomplete bill fix-up" form.
 *
 * Lifecycle transitions enforced here:
 *   extracted  → accepted | rejected | (back to incomplete via PATCH that removes a field)
 *   incomplete → accepted (only when no missing_fields) | rejected
 *   accepted   → (cannot be patched except for committed; rejection from accepted requires explicit revert)
 *   committed  → frozen (no edits, no rejection); only the InvoiceGeneration
 *                service flips a bill to committed when its invoices commit.
 *   rejected   → frozen.
 */
@Injectable()
export class BillsService {
  constructor(
    @InjectModel(Bill.name)
    private readonly model: Model<BillDocumentModel>,
  ) {}

  async create(dto: CreateBillDto, actor?: string) {
    const missing = this.computeMissingFields(dto);
    const initialStatus: BillStatus = dto.status
      ? (dto.status as BillStatus)
      : missing.length > 0
        ? 'incomplete'
        : 'extracted';

    const doc = await this.model.create({
      billId: newBillId(),
      portfolio_id: dto.portfolio_id.trim(),
      property_id: dto.property_id.trim(),
      unit_id: dto.unit_id?.trim() || null,
      vendor_invoice_number: dto.vendor_invoice_number?.trim() || null,
      vendor_name: dto.vendor_name?.trim() || null,
      vendor_id: dto.vendor_id?.trim() || null,
      invoice_date: dto.invoice_date ? new Date(dto.invoice_date) : null,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      service_period_start: dto.service_period_start
        ? new Date(dto.service_period_start)
        : null,
      service_period_end: dto.service_period_end
        ? new Date(dto.service_period_end)
        : null,
      total_amount: dto.total_amount ?? null,
      currency: dto.currency ?? 'USD',
      expense_category: dto.expense_category ?? null,
      status: initialStatus,
      source_file_url: dto.source_file_url ?? null,
      source_page_range: dto.source_page_range ?? null,
      ocr_confidence: dto.ocr_confidence ?? null,
      missing_fields: missing,
      additional_meta_data: dto.additional_meta_data ?? {},
      session_id: dto.session_id ?? null,
      created_by: actor ?? null,
    });
    return toPayload(doc.toObject());
  }

  async list(filter: {
    portfolio_id: string;
    property_id?: string;
    status?: BillStatus | BillStatus[];
    session_id?: string;
    invoice_date_from?: string;
    invoice_date_to?: string;
  }) {
    const q: FilterQuery<BillDocumentModel> = {
      portfolio_id: filter.portfolio_id,
    };
    if (filter.property_id) q.property_id = filter.property_id;
    if (filter.session_id) q.session_id = filter.session_id;
    if (filter.status) {
      q.status = Array.isArray(filter.status)
        ? { $in: filter.status }
        : filter.status;
    }
    if (filter.invoice_date_from || filter.invoice_date_to) {
      q.invoice_date = {};
      if (filter.invoice_date_from)
        (q.invoice_date as Record<string, Date>).$gte = new Date(
          filter.invoice_date_from,
        );
      if (filter.invoice_date_to)
        (q.invoice_date as Record<string, Date>).$lte = new Date(
          filter.invoice_date_to,
        );
    }
    const docs = await this.model
      .find(q)
      .sort({ invoice_date: -1, createdAt: -1 })
      .limit(500)
      .lean();
    return docs.map(toPayload);
  }

  async getOne(portfolioId: string, billId: string) {
    const doc = await this.model
      .findOne({ portfolio_id: portfolioId, billId })
      .lean();
    if (!doc) throw new NotFoundException(`Bill ${billId} not found`);
    return toPayload(doc);
  }

  async update(portfolioId: string, billId: string, dto: UpdateBillDto) {
    const doc = await this.model.findOne({ portfolio_id: portfolioId, billId });
    if (!doc) throw new NotFoundException(`Bill ${billId} not found`);
    if (doc.status === 'committed' || doc.status === 'rejected') {
      throw new BadRequestException(
        `Cannot modify a bill with status=${doc.status}`,
      );
    }

    if (dto.vendor_invoice_number !== undefined)
      doc.vendor_invoice_number = dto.vendor_invoice_number.trim() || null;
    if (dto.vendor_name !== undefined)
      doc.vendor_name = dto.vendor_name.trim() || null;
    if (dto.vendor_id !== undefined)
      doc.vendor_id = dto.vendor_id.trim() || null;
    if (dto.invoice_date !== undefined)
      doc.invoice_date = dto.invoice_date ? new Date(dto.invoice_date) : null;
    if (dto.due_date !== undefined)
      doc.due_date = dto.due_date ? new Date(dto.due_date) : null;
    if (dto.service_period_start !== undefined)
      doc.service_period_start = dto.service_period_start
        ? new Date(dto.service_period_start)
        : null;
    if (dto.service_period_end !== undefined)
      doc.service_period_end = dto.service_period_end
        ? new Date(dto.service_period_end)
        : null;
    if (dto.total_amount !== undefined) doc.total_amount = dto.total_amount;
    if (dto.currency !== undefined) doc.currency = dto.currency;
    if (dto.expense_category !== undefined)
      doc.expense_category = dto.expense_category ?? null;
    if (dto.unit_id !== undefined) doc.unit_id = dto.unit_id?.trim() || null;
    if (dto.additional_meta_data !== undefined)
      doc.additional_meta_data = dto.additional_meta_data;

    // Recompute missing_fields after the patch — Story 12.
    doc.missing_fields = this.computeMissingFields({
      vendor_name: doc.vendor_name ?? undefined,
      invoice_date: doc.invoice_date?.toISOString() ?? undefined,
      total_amount: doc.total_amount ?? undefined,
      expense_category: doc.expense_category ?? undefined,
    } as CreateBillDto);

    // If we were `incomplete` and now have all fields, bump to `extracted`.
    // (Stays `incomplete` if user re-introduced a gap.)
    if (doc.status === 'incomplete' && doc.missing_fields.length === 0) {
      doc.status = 'extracted';
    } else if (doc.status === 'extracted' && doc.missing_fields.length > 0) {
      doc.status = 'incomplete';
    }

    await doc.save();
    return toPayload(doc.toObject());
  }

  async transition(
    portfolioId: string,
    billId: string,
    dto: TransitionBillDto,
  ) {
    const doc = await this.model.findOne({ portfolio_id: portfolioId, billId });
    if (!doc) throw new NotFoundException(`Bill ${billId} not found`);
    if (doc.status === 'committed' || doc.status === 'rejected') {
      throw new BadRequestException(
        `Bill already ${doc.status}; cannot transition again`,
      );
    }
    if (dto.to === 'accepted') {
      if (doc.missing_fields.length > 0) {
        throw new BadRequestException(
          `Bill has missing fields: ${doc.missing_fields.join(', ')}`,
        );
      }
      doc.status = 'accepted';
      doc.accepted_by = dto.actor ?? null;
      doc.accepted_at = new Date();
    } else {
      doc.status = 'rejected';
    }
    await doc.save();
    return toPayload(doc.toObject());
  }

  /**
   * Bulk-mark a list of bills as `committed`. Called by InvoiceGeneration
   * after the corresponding invoices land. Operates only on `accepted` bills.
   */
  async markCommitted(
    portfolioId: string,
    billIds: readonly string[],
  ): Promise<number> {
    if (billIds.length === 0) return 0;
    const res = await this.model.updateMany(
      {
        portfolio_id: portfolioId,
        billId: { $in: [...billIds] },
        status: 'accepted',
      },
      { $set: { status: 'committed' } },
    );
    return res.modifiedCount ?? 0;
  }

  /** Generate a fresh upload session id — used by the wizard's upload step. */
  newSession(): string {
    return newSessionId();
  }

  private computeMissingFields(
    dto: Partial<CreateBillDto>,
  ): typeof COMPULSORY_BILL_FIELDS[number][] {
    const out: typeof COMPULSORY_BILL_FIELDS[number][] = [];
    for (const f of COMPULSORY_BILL_FIELDS) {
      const v = (dto as Record<string, unknown>)[f];
      if (v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
        out.push(f);
      }
    }
    return out;
  }
}

function toPayload(doc: Record<string, any>) {
  return {
    billId: doc.billId,
    portfolio_id: doc.portfolio_id,
    property_id: doc.property_id,
    unit_id: doc.unit_id,
    vendor_invoice_number: doc.vendor_invoice_number,
    vendor_name: doc.vendor_name,
    vendor_id: doc.vendor_id,
    invoice_date: doc.invoice_date,
    due_date: doc.due_date,
    service_period_start: doc.service_period_start,
    service_period_end: doc.service_period_end,
    total_amount: doc.total_amount,
    currency: doc.currency,
    expense_category: doc.expense_category,
    status: doc.status,
    source_file_url: doc.source_file_url,
    source_page_range: doc.source_page_range,
    ocr_confidence: doc.ocr_confidence,
    missing_fields: doc.missing_fields,
    additional_meta_data: doc.additional_meta_data,
    session_id: doc.session_id,
    created_by: doc.created_by,
    accepted_by: doc.accepted_by,
    accepted_at: doc.accepted_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
