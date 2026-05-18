import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class DraftAddendumDto {
  @IsString()
  @MinLength(1)
  riskTitle: string;

  @IsString()
  @MinLength(1)
  originalClause: string;

  @IsString()
  @MinLength(1)
  proposedClause: string;

  @IsString()
  jurisdictionSummary: string;

  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity?: 'critical' | 'high' | 'medium' | 'low';

  @IsOptional()
  @IsString()
  leaseTitle?: string;

  @IsOptional()
  @IsString()
  landlordName?: string;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsOptional()
  @IsString()
  effectiveDate?: string;
}
