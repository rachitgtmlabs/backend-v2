import { HydratedDocument } from 'mongoose';
export type TaskAlertDocumentModel = HydratedDocument<TaskAlert> & {
    createdAt: Date;
    updatedAt: Date;
};
export type TaskAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export declare class TaskAlert {
    itemId: string;
    portfolio_id: string;
    property_id: string;
    lease_id: string;
    unit_id: string | null;
    category: 'alert' | 'task';
    title: string;
    details?: string;
    severity: TaskAlertSeverity;
    sortOrder?: number;
    is_resolved: boolean;
}
export declare const TaskAlertSchema: import("mongoose").Schema<TaskAlert, import("mongoose").Model<TaskAlert, any, any, any, import("mongoose").Document<unknown, any, TaskAlert, any, {}> & TaskAlert & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TaskAlert, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<TaskAlert>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<TaskAlert> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
