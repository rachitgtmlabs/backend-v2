import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskAlertDto {
  @IsString()
  portfolio_id: string;

  @IsOptional()
  @IsString()
  lease_id?: string;

  @IsIn(['alert', 'task'])
  category: 'alert' | 'task';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity?: 'critical' | 'high' | 'medium' | 'low';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  is_resolved?: boolean;

  @IsOptional()
  @IsString()
  alert_type?: string;

  @IsOptional()
  @IsString()
  due_timeline?: string;

  @IsOptional()
  @IsString()
  suggested_action?: string;
}
