import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { UNIT_TYPES, UnitType } from '../schemas/unit.schema';

/**
 * CAM allocation patch shape — matches the CamAllocation embedded sub-schema.
 * Pass `null` for the whole field on the parent DTO to clear the allocation
 * (engine then treats the unit as "skip, not configured").
 */
export class CamAllocationPatch {
  @IsNumber()
  @Min(0)
  base_amount: number;

  @IsInt()
  @Min(2000)
  base_year: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  share_pct: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  admin_fee_pct?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rule_ids?: string[];

  @IsOptional()
  @IsString()
  rule_name?: string;

  @IsOptional()
  @IsIn(['lease_abstraction', 'manual_override'])
  source?: 'lease_abstraction' | 'manual_override';
}

/**
 * Unit form DTO for PATCH updates. Excludes unit_code (immutable),
 * portfolio_id, property_id, and other system fields.
 */
export class UpdateUnitFormDto {
  @IsOptional()
  @IsString()
  unit_name?: string;

  @IsOptional()
  @IsIn(UNIT_TYPES)
  unit_type?: UnitType;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  premises?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sqft_rentable?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sqft_usable?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  parking_count?: number;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['occupied', 'vacant'])
  occupancy_status?: 'occupied' | 'vacant';

  /**
   * CAM allocation patch — pass an object to set/update the rule, or
   * explicit `null` to clear it (engine then skips the unit).
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CamAllocationPatch)
  cam_allocation?: CamAllocationPatch | null;
}
