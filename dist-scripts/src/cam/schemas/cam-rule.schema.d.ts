import { HydratedDocument } from 'mongoose';
export type CamRuleDocumentModel = HydratedDocument<CamRule> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class CamRule {
    ruleId: string;
    portfolio_id: string;
    rule_code: string;
    rule_name: string;
    description: string;
    base_amount: number;
    base_year: number;
    share_pct: number;
    admin_fee_pct: number | null;
    exclusions: string[];
    created_by: string | null;
}
export declare const CamRuleSchema: import("mongoose").Schema<CamRule, import("mongoose").Model<CamRule, any, any, any, import("mongoose").Document<unknown, any, CamRule, any, {}> & CamRule & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CamRule, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CamRule>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CamRule> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
