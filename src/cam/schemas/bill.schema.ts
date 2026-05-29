import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BillDocumentModel = HydratedDocument<Bill> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Story 3 — standard Bill data model.
 *
 * Lifecycle (Stories 10, 12, 14, 19):
 *   extracted   — OCR/AI returned a result with all compulsory fields.
 *   incomplete  — OCR/AI returned but compulsory fields are missing
 *                  (`missing_fields` lists which ones; Story 12/13).
 *   accepted    — user reviewed and accepted in the queue (Story 14).
 *                  Eligible for invoice generation (Story 15).
 *   rejected    — user rejected; ignored downstream.
 *   committed   — invoices were generated and committed (Story 19); bill
 *                  is now part of the canonical ledger.
 *
 * Compulsory fields per docx Story 3: vendor_invoice_number, vendor_name,
 * invoice_date, due_date, service_period_start/end, total_amount, currency,
 * property_id, expense_category, status, source_file_url.
 */
export type BillStatus =
  | 'extracted'
  | 'incomplete'
  | 'accepted'
  | 'rejected'
  | 'committed';

@Schema({ collection: 'bills', timestamps: true })
export class Bill {
  /** Public id, e.g. bil_<hex> */
  @Prop({ type: String, required: true, index: { unique: true, sparse: true } })
  billId: string;

  @Prop({ type: String, required: true, index: true })
  portfolio_id: string;

  @Prop({ type: String, required: true, index: true })
  property_id: string;

  /** Optional during single_unit shortcut (single-unit property auto-fills). */
  @Prop({ type: String, default: null, index: true })
  unit_id: string | null;

  @Prop({ type: String, default: null })
  vendor_invoice_number: string | null;

  @Prop({ type: String, default: null })
  vendor_name: string | null;

  /** Free-text vendor identifier from OCR; may differ from vendor_name. */
  @Prop({ type: String, default: null })
  vendor_id: string | null;

  @Prop({ type: Date, default: null })
  invoice_date: Date | null;

  @Prop({ type: Date, default: null })
  due_date: Date | null;

  @Prop({ type: Date, default: null })
  service_period_start: Date | null;

  @Prop({ type: Date, default: null })
  service_period_end: Date | null;

  /**
   * Total amount in `currency` smallest decimal — we store as number for
   * arithmetic convenience. The engine consumes this directly when
   * accumulating thresholds (Story 16 algorithm; never multiplied by
   * share_pct at intake — that's an engine concern).
   */
  @Prop({ type: Number, default: null })
  total_amount: number | null;

  @Prop({ type: String, required: true, default: 'USD' })
  currency: string;

  /**
   * Category name (matches `ExpenseCategory.name`). Stored as string so the
   * OCR pipeline can stay string-based without a JOIN.
   */
  @Prop({ type: String, default: null })
  expense_category: string | null;

  @Prop({
    required: true,
    enum: ['extracted', 'incomplete', 'accepted', 'rejected', 'committed'],
    default: 'extracted',
    index: true,
  })
  status: BillStatus;

  /** GCS public path to the original PDF/JPG/PNG (Story 9). */
  @Prop({ type: String, default: null })
  source_file_url: string | null;

  /**
   * For multi-bill PDFs (Story 8): which page range in the source file
   * this bill came from. e.g. "1", "2-3".
   */
  @Prop({ type: String, default: null })
  source_page_range: string | null;

  /** OCR confidence 0..1; used by UI to highlight low-confidence rows. */
  @Prop({ type: Number, default: null })
  ocr_confidence: number | null;

  /** Compulsory fields that failed extraction (Story 12). */
  @Prop({ type: [String], default: [] })
  missing_fields: string[];

  /**
   * Story 11 — overflow JSON from OCR/AI that doesn't fit the core columns
   * (account numbers, meter IDs, service addresses, etc.).
   */
  @Prop({ type: Object, default: {} })
  additional_meta_data: Record<string, unknown>;

  /**
   * Story 6 — session this bill was uploaded under. Lets the wizard show
   * "Recent Sessions" on the landing page and lets multi-bill PDFs group.
   */
  @Prop({ type: String, default: null, index: true })
  session_id: string | null;

  @Prop({ type: String, default: null })
  created_by: string | null;

  @Prop({ type: String, default: null })
  accepted_by: string | null;

  @Prop({ type: Date, default: null })
  accepted_at: Date | null;
}

export const BillSchema = SchemaFactory.createForClass(Bill);

BillSchema.index({ property_id: 1, status: 1, invoice_date: -1 });
BillSchema.index({ portfolio_id: 1, status: 1, invoice_date: -1 });
BillSchema.index({ session_id: 1, status: 1 });
// Defense against accidental duplicate ingestion of the same vendor invoice.
// Sparse because vendor_invoice_number can legitimately be null until OCR
// completes or for vendors that don't issue numbered invoices.
BillSchema.index(
  { property_id: 1, vendor_name: 1, vendor_invoice_number: 1, invoice_date: 1 },
  { sparse: true, name: 'bill_dedup_idx' },
);
