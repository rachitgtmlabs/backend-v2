import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReconcileYearDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsInt()
  @Min(2000)
  calendar_year: number;

  @IsOptional()
  @IsString()
  unit_id?: string;

  /** preview = read-only diff; apply = also create adjustment invoices. */
  @IsOptional()
  @IsBoolean()
  apply?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apply_reason?: string;

  @IsOptional()
  @IsString()
  actor?: string;
}
