import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PropertyDocumentModel = HydratedDocument<Property> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Single-unit vs multi-unit determines how the CAM workflow aggregates bills:
 *  - single_unit: the property has exactly one tenant-bearing space; bills
 *    pass straight to that unit.
 *  - multi_unit:  the property has multiple units; each accepted bill is
 *    allocated across occupied units using each unit's CAM rule.
 *
 * Existing properties migrate to `single_unit` since the unit-migration
 * created exactly one Unit per property.
 */
export type PropertyKind = 'single_unit' | 'multi_unit';

@Schema({ collection: 'properties', timestamps: true })
export class Property {
  @Prop({ required: true, index: { unique: true, sparse: true } })
  propertyId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ required: true })
  property_name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  property_type: string;

  /** Public HTTPS URL to object in GCS; not binary / not GridFS */
  @Prop({ type: String, default: null })
  thumbnail_url: string | null;

  @Prop({
    type: String,
    enum: ['single_unit', 'multi_unit'],
    default: 'single_unit',
    index: true,
  })
  property_kind: PropertyKind;

  @Prop({ type: Number, default: null })
  purchase_price: number | null;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ portfolio_id: 1, createdAt: -1 });
PropertySchema.index({ portfolioId: 1, createdAt: -1 }, { sparse: true });
