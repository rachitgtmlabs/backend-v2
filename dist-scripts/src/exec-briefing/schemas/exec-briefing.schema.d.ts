import { HydratedDocument } from 'mongoose';
export type ExecBriefingDocument = HydratedDocument<ExecBriefing> & {
    createdAt: Date;
    updatedAt: Date;
};
export type ExecBriefingStatus = 'generating' | 'ready' | 'failed';
export declare class ExecBriefingStats {
    camBilledYtdUsd: number;
    camStillRecoverableUsd: number;
    outstandingFromTenantsUsd: number;
    decisionsNeedingInputCount: number;
    occupancyPct: number | null;
    expiringNext12MonthsCount: number;
    expiringAnnualRentAtStakeUsd: number;
    tenantConcentrationPct: number;
    tenantConcentrationTopN: number;
}
export declare class ExecBriefingItem {
    title: string;
    body?: string;
    tone: 'positive' | 'concern' | 'critical';
    amountUsd: number | null;
    suggestedAction: string | null;
    propertyId: string | null;
    leaseId: string | null;
}
export declare class ExecBriefing {
    briefingId: string;
    orgId: string;
    briefingWeekStart: string;
    timezone: string;
    generatedAt: Date;
    stats: ExecBriefingStats;
    headline: string;
    summary: string;
    whatsWorking: ExecBriefingItem[];
    zoomIn: ExecBriefingItem[];
    questions: string[];
    status: ExecBriefingStatus;
}
export declare const ExecBriefingSchema: import("mongoose").Schema<ExecBriefing, import("mongoose").Model<ExecBriefing, any, any, any, import("mongoose").Document<unknown, any, ExecBriefing, any, {}> & ExecBriefing & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ExecBriefing, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ExecBriefing>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ExecBriefing> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
