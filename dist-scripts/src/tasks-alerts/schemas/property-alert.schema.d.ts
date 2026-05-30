import { HydratedDocument } from 'mongoose';
import { TaskAlertSeverity } from './task-alert.schema';
export type PropertyAlertDocumentModel = HydratedDocument<PropertyAlert> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class PropertyAlert {
    itemId: string;
    portfolio_id: string;
    property_id: string;
    lease_id: string;
    unit_id: string | null;
    title: string;
    details?: string;
    severity: TaskAlertSeverity;
    sortOrder?: number;
    is_resolved: boolean;
    alert_type?: string;
    due_timeline?: string;
    suggested_action?: string;
}
export declare const PropertyAlertSchema: import("mongoose").Schema<PropertyAlert, import("mongoose").Model<PropertyAlert, any, any, any, import("mongoose").Document<unknown, any, PropertyAlert, any, {}> & PropertyAlert & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PropertyAlert, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PropertyAlert>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PropertyAlert> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
