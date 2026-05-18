import { IsArray, IsNotEmpty, IsString, ValidateNested, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

class ContextDto {
  @IsString()
  @IsNotEmpty()
  portfolio_id: string;

  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsString()
  @IsNotEmpty()
  lease_id: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ContextDto)
  context?: ContextDto;
}

export class ChatResponseDto {
  response: string;
}
