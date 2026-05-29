import { HydratedDocument } from 'mongoose';
export type UnitThresholdDocumentModel = HydratedDocument<UnitThreshold> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class UnitThreshold {
    thresholdId: string;
    unit_id: string;
    property_id: string;
    portfolio_id: string;
    calendar_year: number;
    threshold_amount: number;
    last_bill_id: string | null;
    bills_applied_count: number;
}
export declare const UnitThresholdSchema: import("mongoose").Schema<UnitThreshold, import("mongoose").Model<UnitThreshold, any, any, any, import("mongoose").Document<unknown, any, UnitThreshold, any, {}> & UnitThreshold & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UnitThreshold, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<UnitThreshold>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<UnitThreshold> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
