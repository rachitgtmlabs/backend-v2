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
}

export const UserSchema = SchemaFactory.createForClass(User);
