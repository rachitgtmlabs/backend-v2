import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

export interface CalendarEventInput {
  title: string;
  /** ISO date string or human-readable date like "March 15, 2025". */
  date: string;
  description?: string;
  /** Overrides GOOGLE_CALENDAR_ATTENDEE_EMAIL for this event. */
  attendeeEmail?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly enabled: boolean;
  private readonly calendarId: string;
  private readonly attendeeEmail: string;
  private readonly clientEmail: string | undefined;
  private readonly privateKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    const raw = config.get<string>('GOOGLE_CALENDAR_ENABLED') ?? 'true';
    this.enabled = raw.trim().toLowerCase() !== 'false';
    this.calendarId = config.get<string>('GOOGLE_CALENDAR_ID') ?? 'primary';
    this.attendeeEmail =
      config.get<string>('GOOGLE_CALENDAR_ATTENDEE_EMAIL') ?? '';
    this.clientEmail = config.get<string>('GOOGLE_CALENDAR_CLIENT_EMAIL');
    this.privateKey = config
      .get<string>('GOOGLE_CALENDAR_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEventResult | null> {
    if (!this.enabled) {
      this.logger.log('Google Calendar is disabled (GOOGLE_CALENDAR_ENABLED=false). Skipping event creation.');
      return null;
    }

    if (!this.clientEmail || !this.privateKey) {
      this.logger.warn(
        'GOOGLE_CALENDAR_CLIENT_EMAIL or GOOGLE_CALENDAR_PRIVATE_KEY is not set. Skipping event creation.',
      );
      return null;
    }

    const auth = new google.auth.JWT({
      email: this.clientEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const eventDate = this.parseDate(input.date);
    const nextDay = new Date(eventDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendeeEmail = input.attendeeEmail ?? this.attendeeEmail;
    const attendees = attendeeEmail ? [{ email: attendeeEmail }] : [];

    const response = await calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: input.title,
        description: input.description,
        start: { date: this.toDateString(eventDate) },
        end: { date: this.toDateString(nextDay) },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      },
    });

    const event = response.data;
    this.logger.log(`Calendar event created: ${event.id}`);
    return {
      eventId: event.id ?? '',
      htmlLink: event.htmlLink ?? '',
    };
  }

  private parseDate(raw: string): Date {
    const trimmed = raw.trim();
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
    // Fallback: 7 days from now if unparseable
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    this.logger.warn(`Could not parse date "${raw}", using fallback (+7 days).`);
    return fallback;
  }

  private toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
