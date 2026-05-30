import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PropertyTypeValue } from './create-property-form.dto';

export class UpdatePropertyFormDto {
  @IsString()
  @IsOptional()
  property_name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(PropertyTypeValue)
  @IsOptional()
  property_type?: PropertyTypeValue;

  @IsString()
  @IsOptional()
  portfolio_id?: string;
}
