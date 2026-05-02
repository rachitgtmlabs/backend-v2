import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PortfolioDocumentModel = HydratedDocument<Portfolio> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ _id: false })
export class Classification {
  @Prop({ required: true })
  property_type: string;
}
const ClassificationSchema = SchemaFactory.createForClass(Classification);

@Schema({ _id: false })
export class Locale {
  @Prop({ required: true })
  timezone: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  measurement_system: string;
}
const LocaleSchema = SchemaFactory.createForClass(Locale);

@Schema({ _id: false })
export class Stakeholder {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  role: string;
}
const StakeholderSchema = SchemaFactory.createForClass(Stakeholder);

@Schema({ _id: false })
export class DocumentRequirement {
  @Prop({ required: true })
  docRequirementId: string;

  @Prop({ required: true })
  document_type: string;

  @Prop({ required: true })
  requirement_level: string;
}
const DocumentRequirementSchema =
  SchemaFactory.createForClass(DocumentRequirement);

@Schema({ _id: false })
export class Attributes {
  @Prop({ type: Object, default: {} })
  custom_fields: Record<string, unknown>;

  @Prop({ default: 'ui' })
  source: string;
}
const AttributesSchema = SchemaFactory.createForClass(Attributes);

@Schema({ collection: 'portfolios', timestamps: true })
export class Portfolio {
  @Prop({ required: true, unique: true, index: true })
  portfolioId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: ClassificationSchema, required: true })
  classification: Classification;

  @Prop({ type: LocaleSchema, required: true })
  locale: Locale;

  @Prop({ type: [StakeholderSchema], default: [] })
  stakeholders: Stakeholder[];

  @Prop({ type: [DocumentRequirementSchema], default: [] })
  document_requirements: DocumentRequirement[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: AttributesSchema,
    default: () => ({ custom_fields: {}, source: 'ui' }),
  })
  attributes: Attributes;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: 'user_admin' })
  created_by: string;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
