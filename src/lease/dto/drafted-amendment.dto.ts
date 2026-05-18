import { IsIn, IsOptional, IsString } from 'class-validator';

export class DraftedAmendmentDto {
  @IsString()
  key: string;

  @IsString()
  riskTitle: string;

  @IsIn(['critical', 'high', 'medium', 'low'])
  riskSeverity: 'critical' | 'high' | 'medium' | 'low';

  @IsString()
  originalClause: string;

  @IsString()
  proposedClause: string;

  @IsString()
  resolutionLabel: string;

  @IsString()
  resolutionValue: string;

  @IsOptional()
  @IsString()
  reminderIso: string | null;

  @IsString()
  markdown: string;

  @IsString()
  generatedAt: string;
}
