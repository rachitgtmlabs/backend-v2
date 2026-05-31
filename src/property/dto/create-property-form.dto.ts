import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum PropertyTypeValue {
  commercial = 'commercial',
  residential = 'residential',
  mixed_use = 'mixed_use',
  industrial = 'industrial',
}

export class CreatePropertyFormDto {
  @IsString()
  @IsNotEmpty()
  property_name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsEnum(PropertyTypeValue)
  property_type: PropertyTypeValue;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchase_price?: number;
}
