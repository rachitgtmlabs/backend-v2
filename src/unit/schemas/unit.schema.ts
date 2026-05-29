import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnitDocumentModel = HydratedDocument<Unit> & {
  createdAt: Date;
  updatedAt: Date;
};

export type UnitStatus = 'active' | 'archived';

/**
 * Whether a tenant is currently in possession. Distinct from `status`
 * (active/archived) — a unit can be `active` but `vacant` between leases.
 * The CAM engine skips `vacant` units entirely; the bill share that would
 * have gone to a vacant unit is absorbed by the property.
 */
export type UnitOccupancyStatus = 'occupied' | 'vacant';

/** Whether the CAM allocation was auto-resolved or hand-overridden. */
export type CamRuleSource = 'lease_abstraction' | 'manual_override';

export type UnitType =
  | 'retail'
  | 'office'
  | 'industrial'
  | 'residential'
  | 'mixed_use'
  | 'other';

export const UNIT_TYPES: readonly UnitType[] = [
  'retail',
  'office',
  'industrial',
  'residential',
  'mixed_use',
  'other',
];

/**
 * Per-unit CAM allocation. Embedded on the Unit because it's 1:1 and
 * changes infrequently (lease amendments). The shape is the single-model
 * from the locked algorithm — no rule-type union.
 *
 *   base_amount   — dollar ceiling of *total property CAM bills* the tenant
 *                   absorbs before pass-through begins. 0 = full pass-through
 *                   from dollar one (NNN behavior).
 *   base_year     — calendar year that established the ceiling. Display/audit
 *                   only — the YTD threshold resets on Jan 1 regardless.
 *   share_pct     — pro-rata share (0..1) applied to the OVERAGE only.
 *   exclusions    — category names that don't produce an invoice for this
 *                   tenant. Excluded bills STILL update the threshold.
 *   admin_fee_pct — optional surcharge on the billable portion (post-share).
 *   rule_ids      — citation IDs for audit trail.
 *   rule_name     — display label.
 *   source        — 'lease_abstraction' or 'manual_override'.
 */
@Schema({ _id: false })
export class CamAllocation {
  @Prop({ type: Number, required: true, default: 0 })
  base_amount: number;

  @Prop({ type: Number, required: true })
  base_year: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  share_pct: number;

  @Prop({ type: [String], default: [] })
  exclusions: string[];

  @Prop({ type: Number, default: null })
  admin_fee_pct: number | null;

  @Prop({ type: [String], default: [] })
  rule_ids: string[];

  @Prop({ type: String, default: '' })
  rule_name: string;

  @Prop({
    type: String,
    enum: ['lease_abstraction', 'manual_override'],
    default: 'lease_abstraction',
  })
  source: CamRuleSource;
}

const CamAllocationSchema = SchemaFactory.createForClass(CamAllocation);

@Schema({ collection: 'units', timestamps: true })
export class Unit {
  /** Public id, e.g. unt_<hex> */
  @Prop({ required: true, index: { unique: true, sparse: true } })
  unitId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ required: true, index: true })
  property_id: string;

  /**
   * Canonical handle ("MAIN", "1200", "BLDG-A-2F"). Normalized via
   * `normalizeUnitCode` before insert. Uniqueness is enforced per property
   * by the compound index below.
   */
  @Prop({ required: true })
  unit_code: string;

  /** Human-friendly label as the user typed it ("Suite 1200"). */
  @Prop({ required: true })
  unit_name: string;

  /**
   * Use classification for the space. Surfaced by Add Unit; the lease
   * extractor doesn't fill this — it's a tenant-management attribute, not
   * a lease attribute.
   */
  @Prop({
    type: String,
    enum: ['retail', 'office', 'industrial', 'residential', 'mixed_use', 'other'],
    default: null,
  })
  unit_type: UnitType | null;

  /** Free-text floor/level identifier ("Ground", "2", "Mezzanine"). */
  @Prop({ type: String, default: null })
  floor: string | null;

  @Prop({ type: String, default: null })
  building: string | null;

  @Prop({ type: String, default: null })
  premises: string | null;

  @Prop({ type: Number, default: null })
  sqft_rentable: number | null;

  @Prop({ type: Number, default: null })
  sqft_usable: number | null;

  @Prop({ type: Number, default: null })
  parking_count: number | null;

  @Prop({ required: true, enum: ['active', 'archived'], default: 'active' })
  status: UnitStatus;

  /**
   * Tenancy state — separate from `status`. Vacant units are skipped by the
   * CAM engine; bills that would have allocated to them are absorbed by the
   * property. Existing units migrate to `occupied` (one occupied unit per
   * legacy property was the migration assumption).
   */
  @Prop({
    required: true,
    enum: ['occupied', 'vacant'],
    default: 'occupied',
    index: true,
  })
  occupancy_status: UnitOccupancyStatus;

  /**
   * Embedded CAM allocation. Null until lease abstraction resolves rules
   * or the user configures them manually. The engine treats null as
   * "skip this unit" — same as vacant — so unconfigured units don't
   * generate invoices accidentally.
   */
  @Prop({ type: CamAllocationSchema, default: null })
  cam_allocation: CamAllocation | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  /**
   * Marks units the one-shot migration auto-created for legacy properties.
   * Lets the UI surface a "rename this default unit" prompt and lets the
   * migration script re-run idempotently.
   */
  @Prop({ type: Boolean, default: false })
  is_default_migrated: boolean;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);

UnitSchema.index({ property_id: 1, status: 1, createdAt: 1 });
UnitSchema.index({ portfolio_id: 1, property_id: 1 });
// Case-insensitive uniqueness of unit_code within a property. Defense in
// depth on top of the normalize step — catches anything that slips through.
UnitSchema.index(
  { property_id: 1, unit_code: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
