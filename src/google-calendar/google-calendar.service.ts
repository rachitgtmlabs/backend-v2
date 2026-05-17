import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';

export interface CalendarEventInput {
  title: string;
  /** ISO date string like "2026-05-18". */
  date: string;
  description?: string;
  /** Override default attendee/recipient email. */
  attendeeEmail?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
}

const DEFAULT_ATTENDEE_EMAIL = '';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly enabled: boolean;
  private readonly attendeeEmail: string;
  private readonly smtpUser: string;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const raw = config.get<string>('GOOGLE_CALENDAR_ENABLED') ?? 'true';
    this.enabled = raw.trim().toLowerCase() !== 'false';
    this.attendeeEmail =
      config.get<string>('GOOGLE_CALENDAR_ATTENDEE_EMAIL') || DEFAULT_ATTENDEE_EMAIL;

    const smtpHost = config.get<string>('SMTP_HOST');
    const smtpPort = parseInt(config.get<string>('SMTP_PORT') ?? '587', 10);
    this.smtpUser = config.get<string>('SMTP_USER') ?? '';
    const smtpPass = config.get<string>('SMTP_PASS') ?? '';

    if (smtpHost && this.smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: this.smtpUser, pass: smtpPass },
      });
      this.logger.log(`SMTP transport configured (${smtpHost}:${smtpPort})`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Calendar invites will not be sent.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.transporter !== null;
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEventResult | null> {
    if (!this.enabled) {
      this.logger.log('Calendar invites disabled (GOOGLE_CALENDAR_ENABLED=false).');
      return null;
    }
    if (!this.transporter) {
      this.logger.warn('No SMTP transport — cannot send calendar invite.');
      return null;
    }

    const to = input.attendeeEmail || this.attendeeEmail;
    const eventDate = this.parseDate(input.date);
    const nextDay = new Date(eventDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const uid = randomUUID();
    const icsContent = this.buildIcs({
      uid,
      title: input.title,
      description: input.description ?? '',
      startDate: eventDate,
      endDate: nextDay,
      organizer: this.smtpUser,
      attendee: to,
    });

    try {
      await this.transporter.sendMail({
        from: `LeaseIQ <${this.smtpUser}>`,
        to,
        subject: input.title,
        text: [
          input.title,
          '',
          `Date: ${input.date}`,
          '',
          input.description ?? '',
          '',
          'This calendar invite was sent from LeaseIQ.',
        ].join('\n'),
        icalEvent: {
          method: 'REQUEST',
          content: icsContent,
        },
      });

      this.logger.log(`Calendar invite sent to ${to} for ${input.date}`);
      return { eventId: uid, htmlLink: '' };
    } catch (err: any) {
      this.logger.error(`Failed to send calendar invite: ${err.message}`);
      throw new Error(`Failed to send calendar invite: ${err.message}`);
    }
  }

  private buildIcs(opts: {
    uid: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    organizer: string;
    attendee: string;
  }): string {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const fmtDate = (d: Date) =>
      d.toISOString().split('T')[0].replace(/-/g, '');
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LeaseIQ//Calendar Invite//EN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${opts.uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART;VALUE=DATE:${fmtDate(opts.startDate)}`,
      `DTEND;VALUE=DATE:${fmtDate(opts.endDate)}`,
      `SUMMARY:${esc(opts.title)}`,
      `DESCRIPTION:${esc(opts.description)}`,
      `ORGANIZER;CN=LeaseIQ:mailto:${opts.organizer}`,
      `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${opts.attendee}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  private parseDate(raw: string): Date {
    const trimmed = raw?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException('date is required');
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `Could not parse date "${raw}" — expected ISO 8601 (YYYY-MM-DD) or "Month DD, YYYY"`,
      );
    }
    return parsed;
  }
}
