import { IsOptional, IsString } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  title: string;

  /** ISO date string or human-readable date like "March 15, 2025". */
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Override the default attendee email for this event. */
  @IsOptional()
  @IsString()
  attendeeEmail?: string;
}
