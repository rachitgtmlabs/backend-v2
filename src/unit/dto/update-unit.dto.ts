import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { UNIT_TYPES, UnitType } from '../schemas/unit.schema';

export class UpdateUnitDto {
  /** Required for guard-side portfolio access check. */
  @IsString()
  portfolio_id: string;

  @IsOptional()
  @IsString()
  unit_name?: string;

  @IsOptional()
  @IsString()
  unit_code?: string;

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
