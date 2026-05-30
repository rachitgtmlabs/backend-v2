import { HydratedDocument } from 'mongoose';
export type UnitDocumentModel = HydratedDocument<Unit> & {
    createdAt: Date;
    updatedAt: Date;
};
export type UnitStatus = 'active' | 'archived';
export type UnitOccupancyStatus = 'occupied' | 'vacant';
export type CamRuleSource = 'lease_abstraction' | 'manual_override';
export type UnitType = 'retail' | 'office' | 'industrial' | 'residential' | 'mixed_use' | 'other';
export declare const UNIT_TYPES: readonly UnitType[];
export declare class CamAllocation {
    base_amount: number;
    base_year: number;
    share_pct: number;
    exclusions: string[];
    admin_fee_pct: number | null;
    rule_ids: string[];
    rule_name: string;
    source: CamRuleSource;
}
export declare class Unit {
    unitId: string;
    portfolio_id: string;
    property_id: string;
    unit_code: string;
    unit_name: string;
    unit_type: UnitType | null;
    floor: string | null;
    building: string | null;
    premises: string | null;
    sqft_rentable: number | null;
    sqft_usable: number | null;
    parking_count: number | null;
    status: UnitStatus;
    occupancy_status: UnitOccupancyStatus;
    cam_allocation: CamAllocation | null;
    notes: string | null;
    is_default_migrated: boolean;
}
export declare const UnitSchema: import("mongoose").Schema<Unit, import("mongoose").Model<Unit, any, any, any, import("mongoose").Document<unknown, any, Unit, any, {}> & Unit & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Unit, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Unit>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Unit> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
