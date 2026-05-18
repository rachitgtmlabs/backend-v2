import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class DraftedAmendment {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  riskTitle: string;

  @Prop({
    required: true,
    enum: ['critical', 'high', 'medium', 'low'],
  })
  riskSeverity: 'critical' | 'high' | 'medium' | 'low';

  @Prop({ required: true })
  originalClause: string;

  @Prop({ required: true })
  proposedClause: string;

  @Prop({ required: true })
  resolutionLabel: string;

  @Prop({ required: true })
  resolutionValue: string;

  @Prop({ type: String, default: null })
  reminderIso: string | null;

  @Prop({ required: true })
  markdown: string;

  @Prop({ required: true })
  generatedAt: string;
}

export const DraftedAmendmentSchema =
  SchemaFactory.createForClass(DraftedAmendment);
