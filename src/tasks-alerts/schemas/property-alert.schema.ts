import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TaskAlertSeverity } from './task-alert.schema';

export type PropertyAlertDocumentModel = HydratedDocument<PropertyAlert> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Vault alerts (Additional Rent & Recoveries) — separate collection from tasks.
 * Collection: property_alerts
 */
@Schema({ collection: 'property_alerts', timestamps: true })
export class PropertyAlert {
  /** Public id, e.g. ala_<hex> */
  @Prop({ required: true, unique: true, index: true })
  itemId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ required: true, index: true })
  property_id: string;

  @Prop({ required: true, index: true })
  lease_id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  details?: string;

  @Prop({
    required: true,
    enum: ['critical', 'high', 'medium', 'low'],
  })
  severity: TaskAlertSeverity;

  @Prop({ type: Number, required: false })
  sortOrder?: number;

  @Prop({ type: Boolean, default: false })
  is_resolved: boolean;

  @Prop({ required: false })
  alert_type?: string;

  @Prop({ required: false })
  due_timeline?: string;

  @Prop({ required: false })
  suggested_action?: string;
}

export const PropertyAlertSchema = SchemaFactory.createForClass(PropertyAlert);
