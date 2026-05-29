import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnitThresholdDocumentModel = HydratedDocument<UnitThreshold> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Per-unit YTD threshold storage. One row per (unit_id, calendar_year).
 *
 * The CAM engine reads/writes this on every bill: each accepted bill adds
 * `bill.total_amount` to `threshold_amount` for every occupied unit at the
 * property (excluded bills still update threshold — that's a load-bearing
 * invariant from the locked algorithm).
 *
 * On Jan 1 of each calendar year a new row is created with
 * `threshold_amount = 0`; the prior year's row stays for audit (and is
 * what the chronological-replay Reconcile compares against).
 *
 * `last_bill_id` is for idempotency: if the engine sees the same billId
 * twice it skips, preventing double-counting in case of retries.
 */
@Schema({ collection: 'unit_thresholds', timestamps: true })
export class UnitThreshold {
  /** Public id, e.g. uth_<hex> */
  @Prop({ required: true, index: { unique: true, sparse: true } })
  thresholdId: string;

  @Prop({ required: true, index: true })
  unit_id: string;

  @Prop({ required: true, index: true })
  property_id: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ required: true, index: true })
  calendar_year: number;

  /** Running YTD total in property-bill dollars. */
  @Prop({ type: Number, required: true, default: 0 })
  threshold_amount: number;

  /** Last bill applied — idempotency guard. */
  @Prop({ type: String, default: null })
  last_bill_id: string | null;

  /** Number of bills applied this year (for diagnostics). */
  @Prop({ type: Number, default: 0 })
  bills_applied_count: number;
}

export const UnitThresholdSchema = SchemaFactory.createForClass(UnitThreshold);

// Uniqueness: one row per (unit, calendar_year).
UnitThresholdSchema.index(
  { unit_id: 1, calendar_year: 1 },
  { unique: true },
);
UnitThresholdSchema.index({ property_id: 1, calendar_year: 1 });
