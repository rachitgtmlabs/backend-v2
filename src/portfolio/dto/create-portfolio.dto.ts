import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ClassificationDto {
  @IsString()
  property_type: string;
}

export class LocaleDto {
  @IsString()
  timezone: string;

  @IsString()
  currency: string;

  @IsString()
  measurement_system: string;
}

export class StakeholderDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  role: string;
}

export class DocumentRequirementDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  document_type: string;

  @IsString()
  requirement_level: string;
}

export class AttributesDto {
  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  source?: string;
}

export class PortfolioPayloadDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => ClassificationDto)
  classification: ClassificationDto;

  @ValidateNested()
  @Type(() => LocaleDto)
  locale: LocaleDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StakeholderDto)
  stakeholders: StakeholderDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentRequirementDto)
  document_requirements: DocumentRequirementDto[];

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributesDto)
  attributes?: AttributesDto;
}

export class CreatePortfolioDto {
  @ValidateNested()
  @Type(() => PortfolioPayloadDto)
  portfolio: PortfolioPayloadDto;
}
