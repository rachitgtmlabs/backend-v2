import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const BILL_STATUSES = ['extracted', 'incomplete', 'accepted', 'rejected'] as const;
type BillStatusInput = (typeof BILL_STATUSES)[number];

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsOptional()
  @IsString()
  unit_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor_invoice_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendor_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor_id?: string;

  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  service_period_start?: string;

  @IsOptional()
  @IsDateString()
  service_period_end?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  expense_category?: string;

  @IsOptional()
  @IsString()
  source_file_url?: string;

  @IsOptional()
  @IsString()
  source_page_range?: string;

  @IsOptional()
  @IsNumber()
  ocr_confidence?: number;

  @IsOptional()
  @IsObject()
  additional_meta_data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsIn(BILL_STATUSES)
  status?: BillStatusInput;
}

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  vendor_invoice_number?: string;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  vendor_id?: string;

  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  service_period_start?: string;

  @IsOptional()
  @IsDateString()
  service_period_end?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  expense_category?: string;

  @IsOptional()
  @IsString()
  unit_id?: string;

  @IsOptional()
  @IsObject()
  additional_meta_data?: Record<string, unknown>;
}

export class TransitionBillDto {
  /** Stories 12-14 — explicit lifecycle transitions. */
  @IsIn(['accepted', 'rejected'])
  to: 'accepted' | 'rejected';

  /** Optional reason text recorded with the transition. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** User id of the actor (filled by guard in real auth; included for now). */
  @IsOptional()
  @IsString()
  actor?: string;
}

export const COMPULSORY_BILL_FIELDS = [
  'vendor_name',
  'invoice_date',
  'total_amount',
  'expense_category',
] as const;
