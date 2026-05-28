import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DraftedAmendmentDto } from './drafted-amendment.dto';

export class CreateLeaseDto {
  @IsString()
  portfolio_id: string;

  /** Property id (e.g. prp_*) that must belong to `portfolio_id`. */
  @IsString()
  property_id: string;

  /**
   * Unit id (e.g. unt_*) under the property. Optional during the rollout
   * phase — the lease service auto-links to the property's sole active unit
   * when omitted and the property has exactly one. Becomes required after
   * Phase 5 of the unit rollout.
   */
  @IsOptional()
  @IsString()
  unit_id?: string;

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

  /** GCS object path of the uploaded PDF (returned by the analysis stream). */
  @IsOptional()
  @IsString()
  gcs_document_path?: string;

  /**
   * Optional structured amendment drafts the user authored during analysis.
   * Persisted on the resulting Lease/Amendment document.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftedAmendmentDto)
  drafted_amendments?: DraftedAmendmentDto[];
}
