import { UnitType } from '../schemas/unit.schema';
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
}
