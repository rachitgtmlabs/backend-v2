import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationKind = 'domain' | 'personal';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ collection: 'organizations', timestamps: true })
export class Organization {
  @Prop({ required: true, unique: true })
  orgId: string;

  @Prop({ required: true })
  name: string;

  // For domain orgs: the email domain (e.g. "contentstack.com").
  // For personal orgs: the full email address, so each personal-email user
  // owns a distinct, isolated org.
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  domain: string;

  @Prop({ required: true, default: 'domain' })
  kind: OrganizationKind;

  // IANA timezone used to decide when this org's "6 AM" daily briefing fires
  // and to label briefing timestamps. Defaults until set in org settings.
  @Prop({ required: true, default: 'America/New_York' })
  timezone: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
