import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnitDocumentModel = HydratedDocument<Unit> & {
  createdAt: Date;
  updatedAt: Date;
};

export type UnitStatus = 'active' | 'archived';

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
