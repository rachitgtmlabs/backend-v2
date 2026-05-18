import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class ProposedClauseDto {
  @IsString()
  @MinLength(1)
  riskTitle: string;

  @IsString()
  @MinLength(1)
  originalClause: string;

  @IsString()
  jurisdictionSummary: string;

  @IsOptional()
  @IsString()
  existingProposedClause?: string;

  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity?: 'critical' | 'high' | 'medium' | 'low';
}
