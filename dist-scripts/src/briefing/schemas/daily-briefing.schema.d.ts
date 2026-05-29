import { HydratedDocument } from 'mongoose';
export type DailyBriefingDocument = HydratedDocument<DailyBriefing> & {
    createdAt: Date;
    updatedAt: Date;
};
export type BriefingStatus = 'generating' | 'ready' | 'failed';
export declare class BriefingStats {
    leasesChecked: number;
    unitsCount: number;
    propertyCount: number;
    expiringNext12Months: number;
    needsAttentionCount: number;
}
export declare class BriefingItem {
    title: string;
    details?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    leaseId: string | null;
    propertyId: string | null;
}
export declare class DailyBriefing {
    briefingId: string;
    orgId: string;
    briefingDate: string;
    timezone: string;
    generatedAt: Date;
    stats: BriefingStats;
    items: BriefingItem[];
    narrative: string;
    status: BriefingStatus;
}
export declare const DailyBriefingSchema: import("mongoose").Schema<DailyBriefing, import("mongoose").Model<DailyBriefing, any, any, any, import("mongoose").Document<unknown, any, DailyBriefing, any, {}> & DailyBriefing & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DailyBriefing, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<DailyBriefing>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DailyBriefing> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
