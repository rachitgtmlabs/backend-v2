import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DailyBriefingDocument = HydratedDocument<DailyBriefing> & {
  createdAt: Date;
  updatedAt: Date;
};

export type BriefingStatus = 'generating' | 'ready' | 'failed';

/** Snapshot of the numbers the narrative is built from. Computed in code —
 * never authored by an LLM — so the prose can only ever rephrase real values. */
export class BriefingStats {
  @Prop({ type: Number, required: true })
  leasesChecked: number;

  @Prop({ type: Number, required: true })
  unitsCount: number;

  @Prop({ type: Number, required: true })
  propertyCount: number;

  /** Leases whose end date falls in the next 12 months. */
  @Prop({ type: Number, required: true })
  expiringNext12Months: number;

  /** Count of items surfaced under "needs you today". */
  @Prop({ type: Number, required: true })
  needsAttentionCount: number;
}

/** One row of the "needs your attention today" list. Mirrors a TaskAlert. */
export class BriefingItem {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  details?: string;

  @Prop({ required: true, enum: ['critical', 'high', 'medium', 'low'] })
  severity: 'critical' | 'high' | 'medium' | 'low';

  @Prop({ type: String, default: null })
  leaseId: string | null;

  @Prop({ type: String, default: null })
  propertyId: string | null;
}

/**
 * A pre-generated "Daily briefing" for one organization, for one org-local
 * day. The dashboard card reads the latest `ready` row — it never computes a
 * briefing on the fly. Rows are produced by the scheduled job (or a manual
 * POST /briefings/run), keyed `{ orgId, briefingDate }` so re-runs are
 * idempotent.
 */
@Schema({ collection: 'daily_briefings', timestamps: true })
export class DailyBriefing {
  /** Public id, e.g. dbf_<hex>. */
  @Prop({ required: true, unique: true, index: true })
  briefingId: string;

  @Prop({ required: true, index: true })
  orgId: string;

  /** Org-local calendar date the briefing covers, "YYYY-MM-DD". */
  @Prop({ required: true })
  briefingDate: string;

  /** IANA timezone the briefingDate / 6 AM trigger were resolved in. */
  @Prop({ required: true })
  timezone: string;

  /** UTC instant the job actually ran. Rendered in the user's tz on the client. */
  @Prop({ type: Date, required: true })
  generatedAt: Date;

  @Prop({ type: BriefingStats, required: true })
  stats: BriefingStats;

  @Prop({ type: [BriefingItem], default: [] })
  items: BriefingItem[];

  /** The "Good morning…" prose shown in the card. */
  @Prop({ required: true })
  narrative: string;

  @Prop({ required: true, enum: ['generating', 'ready', 'failed'], default: 'ready' })
  status: BriefingStatus;
}

export const DailyBriefingSchema = SchemaFactory.createForClass(DailyBriefing);

// One briefing per org per local day — makes the cron idempotent and lets a
// re-run upsert in place rather than duplicate.
DailyBriefingSchema.index({ orgId: 1, briefingDate: 1 }, { unique: true });
// "latest for this org" lookups.
DailyBriefingSchema.index({ orgId: 1, generatedAt: -1 });
