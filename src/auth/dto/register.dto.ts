import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(254)
  email: string;

  // The password arrives RSA-OAEP encrypted (base64), so strength rules can't
  // run here — they're enforced on the decrypted plaintext in AuthService.
  // 700 bounds a 2048-bit ciphertext (~344 b64 chars) with generous headroom.
  @IsString()
  @MinLength(1)
  @MaxLength(700)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
