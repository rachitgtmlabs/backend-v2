import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  DraftedAmendment,
  DraftedAmendmentSchema,
} from './drafted-amendment.schema';

export type AmendmentDocumentModel = HydratedDocument<Amendment> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Amendment schema - stores DELTA only (changed values from the previous version).
 * 
 * To compute the effective state of a lease:
 * 1. Fetch the original lease
 * 2. Fetch all amendments ordered by version
 * 3. Deep merge: lease → v1 → v2 → v3 = current effective state
 * 
 * The `lease_information` and `analysis` fields contain ONLY values that 
 * changed in this amendment. Unchanged fields are omitted.
 */
@Schema({ collection: 'amendments', timestamps: true })
export class Amendment {
  @Prop({ required: true, index: { unique: true, sparse: true } })
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

  /**
   * DELTA only - contains only lease_information fields that changed in this amendment.
   * Use deepMerge with the original lease to get the full effective values.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  lease_information: Record<string, unknown>;

  /**
   * DELTA only - contains only analysis fields that changed in this amendment.
   * Use deepMerge with the original lease to get the full effective values.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  analysis: Record<string, unknown>;

  /**
   * Risk-driven amendment drafts the user authored during analysis of this
   * amendment document. Stored alongside the amendment so the full markdown
   * survives beyond the TaskAlert audit string.
   */
  @Prop({ type: [DraftedAmendmentSchema], default: [] })
  drafted_amendments: DraftedAmendment[];
}

export const AmendmentSchema = SchemaFactory.createForClass(Amendment);

AmendmentSchema.index({ lease_id: 1, version: 1 });
AmendmentSchema.index({ portfolio_id: 1, property_id: 1, updatedAt: -1 });
