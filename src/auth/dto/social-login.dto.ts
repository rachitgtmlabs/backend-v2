import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'token is required' })
  @MaxLength(4096)
  token: string;
}
