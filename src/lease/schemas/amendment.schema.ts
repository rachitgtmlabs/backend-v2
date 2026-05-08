import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AmendmentDocumentModel = HydratedDocument<Amendment> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ collection: 'amendments', timestamps: true })
export class Amendment {
  @Prop({ required: true, unique: true, index: true })
  amendmentId: string;

  @Prop({ required: true, index: true })
  lease_id: string;

  @Prop({ required: true, index: true })
  version: number;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ type: String, index: true, required: true })
  property_id: string;

  @Prop({ required: true, enum: ['draft', 'processed'] })
  status: string;

  @Prop({ required: true })
  file_name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  lease_information: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  analysis: Record<string, unknown>;
}

export const AmendmentSchema = SchemaFactory.createForClass(Amendment);

// Create compound indexes for optimal querying
AmendmentSchema.index({ lease_id: 1, version: 1 });
AmendmentSchema.index({ property_id: 1, portfolio_id: 1 });
