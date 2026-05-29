import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReconciliationRunDocumentModel =
  HydratedDocument<ReconciliationRun> & {
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * Chronological-replay reconciliation (the "Reconcile YYYY" feature from
 * the Property Ledger — distinct from the wizard's per-batch preview).
 *
 * A run pulls all accepted/committed bills for (property, year), sorts them
 * by `service_period_start`, replays the engine from threshold = 0, and
 * diffs the canonical result against actual committed invoices.
 *
 *   preview — diff computed, nothing written downstream. Re-runnable.
 *   applied — adjustment invoices were created (one per affected unit,
 *              with per-bill line items embedded — see TenantInvoice with
 *              kind='adjustment'). Append-only; never deleted.
 */
export type ReconciliationRunMode = 'preview' | 'applied';

/** Per-unit summary snapshot at run time. */
@Schema({ _id: false })
export class ReconUnitSnapshot {
  @Prop({ required: true })
  unit_id: string;

  @Prop({ type: String, default: null })
  unit_code: string | null;

  @Prop({ type: String, default: null })
  tenant_name: string | null;

  @Prop({ type: Number, required: true })
  actual_invoiced_total: number;

  @Prop({ type: Number, required: true })
  canonical_invoiced_total: number;

  @Prop({ type: Number, required: true })
  delta: number;

  @Prop({ type: Number, required: true })
  actual_threshold_eoy: number;

  @Prop({ type: Number, required: true })
  canonical_threshold_eoy: number;

  /** Adjustment invoice produced for this unit (only set when mode=applied). */
  @Prop({ type: String, default: null })
  adjustment_invoiceId: string | null;
}
const ReconUnitSnapshotSchema = SchemaFactory.createForClass(ReconUnitSnapshot);

@Schema({ collection: 'reconciliation_runs', timestamps: true })
export class ReconciliationRun {
  /** Public id, e.g. rec_<hex> */
  @Prop({ required: true, index: { unique: true, sparse: true } })
  runId: string;

  @Prop({ required: true, index: true })
  property_id: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  /** If scoped to a single unit; null = whole property. */
  @Prop({ type: String, default: null, index: true })
  unit_id: string | null;

  @Prop({ required: true, index: true })
  calendar_year: number;

  @Prop({
    required: true,
    enum: ['preview', 'applied'],
    default: 'preview',
    index: true,
  })
  mode: ReconciliationRunMode;

  @Prop({ required: true })
  triggered_by: string;

  @Prop({ type: Date, required: true })
  triggered_at: Date;

  // ── Summary roll-ups ─────────────────────────────────────────────
  @Prop({ type: Number, required: true, default: 0 })
  total_delta: number;

  @Prop({ type: Number, required: true, default: 0 })
  units_with_discrepancies: number;

  @Prop({ type: Number, required: true, default: 0 })
  bills_affected: number;

  @Prop({ type: [ReconUnitSnapshotSchema], default: [] })
  by_unit: ReconUnitSnapshot[];

  // ── Apply outputs (mode=applied) ────────────────────────────────
  @Prop({ type: [String], default: [] })
  adjustments_created: string[]; // invoiceIds

  @Prop({ type: Date, default: null })
  applied_at: Date | null;

  @Prop({ type: String, default: null })
  applied_by: string | null;

  /** Free-text reason captured from the Apply confirmation modal. */
  @Prop({ type: String, default: null })
  apply_reason: string | null;
}

export const ReconciliationRunSchema =
  SchemaFactory.createForClass(ReconciliationRun);

ReconciliationRunSchema.index({ property_id: 1, calendar_year: 1, mode: 1, createdAt: -1 });
ReconciliationRunSchema.index({ portfolio_id: 1, createdAt: -1 });
