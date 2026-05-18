import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  DraftedAmendment,
  DraftedAmendmentSchema,
} from './drafted-amendment.schema';

export type LeaseDocumentModel = HydratedDocument<Lease> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ collection: 'leases', timestamps: true })
export class Lease {
  @Prop({ required: true, index: { unique: true, sparse: true } })
  leaseId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  /** Linked property (e.g. prp_*) under this portfolio. */
  @Prop({ type: String, index: true, default: null })
  property_id: string | null;

  @Prop({ required: true, enum: ['draft', 'processed'] })
  status: string;

  @Prop({ required: true })
  file_name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  lease_information: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  analysis: Record<string, unknown>;

  @Prop({ type: Number, default: 0, index: true })
  amendment_version: number;

  /**
   * Risk-driven amendment drafts the user authored during analysis.
   * Full structured content + markdown body so the data survives beyond the
   * TaskAlert audit string.
   */
  @Prop({ type: [DraftedAmendmentSchema], default: [] })
  drafted_amendments: DraftedAmendment[];
}

export const LeaseSchema = SchemaFactory.createForClass(Lease);

LeaseSchema.index({ portfolio_id: 1, property_id: 1, updatedAt: -1 });
LeaseSchema.index({
  portfolio_id: 1,
  property_id: 1,
  status: 1,
  updatedAt: -1,
});
LeaseSchema.index({ property_id: 1, updatedAt: -1 });
