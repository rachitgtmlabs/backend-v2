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

  /**
   * Linked unit (e.g. unt_*) under this property. Optional during the
   * Phase 1 → Phase 5 rollout; required after the unit-id backfill migration
   * has run and the read-switch ships.
   */
  @Prop({ type: String, index: true, default: null })
  unit_id: string | null;

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

  /** GCS object path of the original lease PDF (e.g. documents/leases/…). */
  @Prop({ type: String, default: null })
  gcs_document_path: string | null;

  /**
   * Risk-driven amendment drafts the user authored during analysis.
   * Full structured content + markdown body so the data survives beyond the
   * TaskAlert audit string.
   */
  @Prop({ type: [DraftedAmendmentSchema], default: [] })
  drafted_amendments: DraftedAmendment[];

  /**
   * Email of the user who saved this document, captured from the JWT at
   * create time. Null for legacy docs created before this field existed (the
   * vault renders those as "—"). The frontend derives a username from the
   * part before "@".
   */
  @Prop({ type: String, default: null })
  created_by: string | null;

  /**
   * Free-form categorization tags for the Document Vault. Seeded with the
   * document kind (['lease']) and extensible to future kinds (bills, estoppel,
   * …) without a schema migration.
   */
  @Prop({ type: [String], default: ['lease'] })
  tags: string[];
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
LeaseSchema.index({ unit_id: 1, updatedAt: -1 });
LeaseSchema.index({ unit_id: 1, status: 1, updatedAt: -1 });
