import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

/**
 * Frontend may pass partial context — any of these can be omitted.
 * The orchestrator falls back to search tools when ids are missing.
 */
class ContextDto {
  @IsOptional()
  @IsString()
  portfolio_id?: string;

  @IsOptional()
  @IsString()
  property_id?: string;

  @IsOptional()
  @IsString()
  lease_id?: string;

  @IsOptional()
  @IsString()
  active_tab?: string;

  @IsOptional()
  @IsString()
  focused_widget?: string;

  @IsOptional()
  @IsString()
  date_range?: string;
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

export class CitationDto {
  text: string;
  source: 'LEASE' | 'AMENDMENT' | 'TASK' | 'ALERT' | 'CALC';
}

export class ChatResponseDto {
  /** Markdown answer for the chat bubble. */
  answer: string;
  /** Source tags for what the answer is grounded in. */
  citations: CitationDto[];
  /** Dashboard widget keys the frontend should visually highlight. */
  highlightWidgets: string[];
  /** Short follow-up question suggestions. */
  suggestedFollowUps: string[];
  /** How many replan iterations were used (debug/observability). */
  iterationsUsed: number;
  /** Tools that ran (debug/observability). */
  toolsUsed: string[];
  /**
   * Legacy field — kept so older frontends that read `response` still work.
   * Mirrors `answer`.
   */
  response: string;
}
