import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** ISO date string or human-readable date like "March 15, 2025". */
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Override the default attendee email for this event. */
  @IsOptional()
  @IsEmail({}, { message: 'attendeeEmail must be a valid email address' })
  attendeeEmail?: string;
}
