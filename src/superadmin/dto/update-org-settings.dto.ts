import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Partial update of an organization's superadmin-managed quotas / flags.
 * Every field is optional; only the provided keys are written. Limits accept
 * -1 (unlimited) and up; 0 blocks all new creations.
 */
export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxPortfolios?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxLeases?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxAmendments?: number;

  @IsOptional()
  @IsBoolean()
  camReconciliationEnabled?: boolean;
}
