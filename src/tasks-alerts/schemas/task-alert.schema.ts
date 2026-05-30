import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaskAlertDocumentModel = HydratedDocument<TaskAlert> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Priority for UI dots (maps to vault Tasks / Alerts tab). */
export type TaskAlertSeverity = 'critical' | 'high' | 'medium' | 'low';

@Schema({ collection: 'property_task_alerts', timestamps: true })
export class TaskAlert {
  /** Public id, e.g. tka_<hex> */
  @Prop({ required: true, unique: true, index: true })
  itemId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  @Prop({ required: true, index: true })
  property_id: string;

  /** Main lease id (les_*). */
  @Prop({ required: true, index: true })
  lease_id: string;

  /**
   * Unit (unt_*) the lease belongs to. Optional during the unit-rollout
   * migration; required afterward. Inherited from the lease.
   */
  @Prop({ type: String, index: true, default: null })
  unit_id: string | null;

  @Prop({ required: true, enum: ['alert', 'task'] })
  category: 'alert' | 'task';

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

  /** User-facing completion flag (tasks tab, modals). */
  @Prop({ type: Boolean, default: false })
  is_resolved: boolean;
}

export const TaskAlertSchema = SchemaFactory.createForClass(TaskAlert);

TaskAlertSchema.index({
  portfolio_id: 1,
  property_id: 1,
  lease_id: 1,
  category: 1,
});
TaskAlertSchema.index({
  portfolio_id: 1,
  unit_id: 1,
  lease_id: 1,
  category: 1,
});
