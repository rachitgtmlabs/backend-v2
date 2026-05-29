export declare class DraftedAmendment {
    key: string;
    riskTitle: string;
    riskSeverity: 'critical' | 'high' | 'medium' | 'low';
    originalClause: string;
    proposedClause: string;
    resolutionLabel: string;
    resolutionValue: string;
    reminderIso: string | null;
    markdown: string;
    generatedAt: string;
}
export declare const DraftedAmendmentSchema: import("mongoose").Schema<DraftedAmendment, import("mongoose").Model<DraftedAmendment, any, any, any, import("mongoose").Document<unknown, any, DraftedAmendment, any, {}> & DraftedAmendment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DraftedAmendment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<DraftedAmendment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DraftedAmendment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
