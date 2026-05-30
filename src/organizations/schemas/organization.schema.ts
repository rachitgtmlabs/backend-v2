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

  // --- Superadmin-managed quotas & feature flags --------------------------
  // Per-org caps enforced at create time. A negative value (default -1) means
  // "unlimited"; 0 blocks all new creations; N caps at N. Edited from the
  // /superadmin page (see SuperadminController).
  @Prop({ type: Number, default: -1 })
  maxPortfolios: number;

  @Prop({ type: Number, default: -1 })
  maxLeases: number;

  @Prop({ type: Number, default: -1 })
  maxAmendments: number;

  // When false, CAM reconciliation endpoints are blocked for this org by the
  // CamEnabledGuard. Defaults true so existing orgs keep current behavior.
  @Prop({ type: Boolean, default: true })
  camReconciliationEnabled: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
