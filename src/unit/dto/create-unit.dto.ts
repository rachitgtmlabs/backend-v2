import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { UNIT_TYPES, UnitType } from '../schemas/unit.schema';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  /**
   * Required for user-facing creation (Add Unit modal). The one-shot
   * migration script writes directly to the collection and bypasses this
   * DTO, so making it required here doesn't affect default-unit backfill.
   */
  @IsString()
  @IsNotEmpty()
  unit_code: string;

  /** Optional display name; defaults to unit_code if omitted. */
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
}
