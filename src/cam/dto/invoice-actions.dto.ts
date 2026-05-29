import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paid_at: string;

  @IsOptional()
  @IsIn(['ACH', 'Check', 'Wire', 'Credit Card', 'Cash', 'Other'])
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  actor?: string;
}

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsDateString()
  remind_at: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(['in_app', 'email', 'both'])
  channel?: 'in_app' | 'email' | 'both';
}

export class DeleteReminderDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;
}
