import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Nullable so the user can clear it (falls back to login email). Validated as
  // an email only when a non-empty value is provided.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsEmail({}, { message: 'alert_email must be a valid email' })
  @MaxLength(254)
  alert_email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string | null;

  @IsOptional()
  @IsBoolean()
  briefingEmailOptIn?: boolean;
}
