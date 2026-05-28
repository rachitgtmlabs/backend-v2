import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
