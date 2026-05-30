import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// A single WebAuthn / passkey credential registered by a user. A user may have
// several (laptop, phone, security key). Stored as a sub-document on the user;
// passkeys are strictly a user-level credential and never affect org membership.
@Schema({ _id: false })
export class WebauthnCredential {
  // The credential ID (base64url), as returned by the authenticator.
  @Prop({ required: true })
  credentialId: string;

  // COSE public key, base64url-encoded for storage.
  @Prop({ required: true })
  publicKey: string;

  // Signature counter — bumped on every assertion to detect cloned keys.
  @Prop({ required: true, default: 0 })
  counter: number;

  // Transport hints ('internal', 'usb', 'hybrid', …) for nicer browser UX.
  @Prop({ type: [String], default: [] })
  transports: string[];

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const WebauthnCredentialSchema =
  SchemaFactory.createForClass(WebauthnCredential);

@Schema({ timestamps: true })
export class User {
  @Prop()
  name: string;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ select: false })
  password?: string;

  @Prop()
  photoURL?: string;

  @Prop({ default: 'local' })
  provider: 'local' | 'google' | 'phone';

  @Prop({ default: true })
  isActive: boolean;

  // Org each user belongs to. Optional during the migration window so legacy
  // documents still load; backfill-organizations sets it for every existing
  // user, after which this can be flipped to required: true.
  @Prop({ index: true })
  organization_id?: string;

  // When true, this user receives the org's daily briefing by email after each
  // overnight run. Opt-in via the dashboard's "Email me this daily" button.
  @Prop({ default: false })
  briefingEmailOptIn: boolean;

  // Registered passkeys for this user. Empty until the user enrolls one from
  // account settings (they must already be signed in via another provider).
  @Prop({ type: [WebauthnCredentialSchema], default: [] })
  webauthnCredentials: WebauthnCredential[];
}

export const UserSchema = SchemaFactory.createForClass(User);
