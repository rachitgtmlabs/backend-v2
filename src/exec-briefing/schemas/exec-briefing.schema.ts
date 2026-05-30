import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExecBriefingDocument = HydratedDocument<ExecBriefing> & {
  createdAt: Date;
  updatedAt: Date;
};

export type ExecBriefingStatus = 'generating' | 'ready' | 'failed';

/**
 * Snapshot of the numbers the weekly executive briefing is built from.
 * Same rule as the daily briefing: facts are computed in code; any future
 * LLM rephrasing must restate them, never originate them.
 */
export class ExecBriefingStats {
  /** Sum of `tenant_invoices.invoice_amount` (committed) for current year. */
  @Prop({ type: Number, required: true })
  camBilledYtdUsd: number;

  /** Sum of positive deltas across preview reconciliation runs. */
  @Prop({ type: Number, required: true })
  camStillRecoverableUsd: number;

  /** Outstanding tenant receivables (committed invoices, past 30 days, unpaid). */
  @Prop({ type: Number, required: true })
  outstandingFromTenantsUsd: number;

  /** Unresolved critical or high-severity alerts the team can't close. */
  @Prop({ type: Number, required: true })
  decisionsNeedingInputCount: number;

  /** Portfolio occupancy (0-100). Null when no units exist. */
  @Prop({ type: Number, default: null })
  occupancyPct: number | null;

  /** Leases expiring within the next 12 months + the annual rent at stake. */
  @Prop({ type: Number, required: true })
  expiringNext12MonthsCount: number;
  @Prop({ type: Number, required: true })
  expiringAnnualRentAtStakeUsd: number;

  /** Top-N tenant rent concentration as a share of total annual rent. */
  @Prop({ type: Number, required: true })
  tenantConcentrationPct: number;
  @Prop({ type: Number, required: true })
  tenantConcentrationTopN: number;
}

/**
 * One item in the "What's working" or "Where you need to zoom in" sections.
 * Mirrors the briefing's BriefingItem shape but adds an `action` (e.g. a
 * Lex follow-up prompt) and an optional `amountUsd` for dollar callouts.
 */
export class ExecBriefingItem {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  body?: string;

  /** Tone-of-voice tag — drives the side-accent color in the UI. */
  @Prop({
    required: true,
    enum: ['positive', 'concern', 'critical'],
    default: 'concern',
  })
  tone: 'positive' | 'concern' | 'critical';

  /** Optional dollar callout (e.g. "$412K at risk"). */
  @Prop({ type: Number, default: null })
  amountUsd: number | null;

  /** Optional follow-up suggestion. Wired to "Ask Lex" on the frontend. */
  @Prop({ type: String, default: null })
  suggestedAction: string | null;

  /** Optional propertyId / leaseId so the UI can deep-link. */
  @Prop({ type: String, default: null })
  propertyId: string | null;
  @Prop({ type: String, default: null })
  leaseId: string | null;
}

/**
 * A pre-generated executive briefing for one organization, for one
 * org-local ISO week. Cadence is weekly (Monday 6 AM in the org's timezone)
 * vs. the daily operational briefing — different audience, different
 * sections, different lifecycle.
 *
 * Keyed `{ orgId, briefingWeekStart }` so re-runs are idempotent. The
 * scheduler upserts; a manual /run can force-overwrite on demand.
 */
@Schema({ collection: 'exec_briefings', timestamps: true })
export class ExecBriefing {
  /** Public id, e.g. exb_<hex>. */
  @Prop({ required: true, unique: true, index: true })
  briefingId: string;

  @Prop({ required: true, index: true })
  orgId: string;

  /**
   * Monday of the org-local ISO week the briefing covers, "YYYY-MM-DD".
   * The frontend renders it as "Week of <date>".
   */
  @Prop({ required: true })
  briefingWeekStart: string;

  /** IANA timezone the week boundary + 6 AM trigger were resolved in. */
  @Prop({ required: true })
  timezone: string;

  /** UTC instant the job ran; rendered in the user's tz on the client. */
  @Prop({ type: Date, required: true })
  generatedAt: Date;

  @Prop({ type: ExecBriefingStats, required: true })
  stats: ExecBriefingStats;

  /** Top headline — the big bold sentence at the top of the card. */
  @Prop({ required: true })
  headline: string;

  /** Sub-paragraph under the headline. */
  @Prop({ required: true })
  summary: string;

  @Prop({ type: [ExecBriefingItem], default: [] })
  whatsWorking: ExecBriefingItem[];

  @Prop({ type: [ExecBriefingItem], default: [] })
  zoomIn: ExecBriefingItem[];

  /** Suggested questions to ask the team this week. Plain strings. */
  @Prop({ type: [String], default: [] })
  questions: string[];

  @Prop({
    required: true,
    enum: ['generating', 'ready', 'failed'],
    default: 'ready',
  })
  status: ExecBriefingStatus;
}

export const ExecBriefingSchema = SchemaFactory.createForClass(ExecBriefing);

// One briefing per org per local week — keeps the cron idempotent.
ExecBriefingSchema.index(
  { orgId: 1, briefingWeekStart: 1 },
  { unique: true },
);
// "latest for this org" lookups.
ExecBriefingSchema.index({ orgId: 1, generatedAt: -1 });
