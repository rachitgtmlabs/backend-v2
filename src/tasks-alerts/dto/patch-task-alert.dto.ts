import { IsBoolean, IsString } from 'class-validator';

export class PatchTaskAlertDto {
  @IsString()
  portfolio_id: string;

  @IsString()
  lease_id: string;

  @IsBoolean()
  is_resolved: boolean;
}
