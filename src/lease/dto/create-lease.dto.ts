import { IsIn, IsObject, IsString } from 'class-validator';

export class CreateLeaseDto {
  @IsString()
  portfolio_id: string;

  /** Property id (e.g. prp_*) that must belong to `portfolio_id`. */
  @IsString()
  property_id: string;

  @IsIn(['draft', 'processed'])
  status: 'draft' | 'processed';

  @IsIn(['main lease', 'amendment'])
  document_type: 'main lease' | 'amendment';

  @IsString()
  file_name: string;

  @IsObject()
  lease_information: Record<string, unknown>;

  @IsObject()
  analysis: Record<string, unknown>;
}
