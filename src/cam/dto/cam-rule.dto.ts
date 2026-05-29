import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCamRuleDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  rule_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  rule_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(0)
  base_amount: number;

  @IsInt()
  @Min(1900)
  @Max(2200)
  base_year: number;

  /** Decimal 0..1 (UI converts from 0..100 before posting). */
  @IsNumber()
  @Min(0)
  @Max(1)
  share_pct: number;

  /** Decimal 0..1 or null. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  admin_fee_pct?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  exclusions?: string[];
}

export class UpdateCamRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  rule_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  rule_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  base_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  base_year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  share_pct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  admin_fee_pct?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  exclusions?: string[];
}
