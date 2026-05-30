import { UnitType } from '../schemas/unit.schema';
export declare class CamAllocationPatch {
    base_amount: number;
    base_year: number;
    share_pct: number;
    exclusions?: string[];
    admin_fee_pct?: number | null;
    rule_ids?: string[];
    rule_name?: string;
    source?: 'lease_abstraction' | 'manual_override';
}
export declare class UpdateUnitDto {
    portfolio_id: string;
    unit_name?: string;
    unit_code?: string;
    unit_type?: UnitType;
    floor?: string;
    building?: string;
    premises?: string;
    sqft_rentable?: number;
    sqft_usable?: number;
    parking_count?: number;
    status?: 'active' | 'archived';
    notes?: string;
    cam_allocation?: CamAllocationPatch | null;
    occupancy_status?: 'occupied' | 'vacant';
}
