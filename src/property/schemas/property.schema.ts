import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PropertyDocumentModel = HydratedDocument<Property> & {
  createdAt: Date;
  updatedAt: Date;
};

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
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ portfolio_id: 1, createdAt: -1 });
PropertySchema.index({ portfolioId: 1, createdAt: -1 }, { sparse: true });
