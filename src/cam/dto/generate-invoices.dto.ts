import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateInvoicesDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsOptional()
  @IsString()
  session_id?: string;
}

export class CommitInvoicesDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  actor?: string;
}
