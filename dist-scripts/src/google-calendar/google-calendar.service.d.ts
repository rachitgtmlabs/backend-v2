import { ConfigService } from '@nestjs/config';
export interface CalendarEventInput {
    title: string;
    date: string;
    description?: string;
    attendeeEmail?: string;
}
export interface CalendarEventResult {
    eventId: string;
    htmlLink: string;
}
export declare class GoogleCalendarService {
    private readonly config;
    private readonly logger;
    private readonly enabled;
    private readonly attendeeEmail;
    private readonly smtpUser;
    private readonly transporter;
    constructor(config: ConfigService);
    isEnabled(): boolean;
    createEvent(input: CalendarEventInput): Promise<CalendarEventResult | null>;
    private buildIcs;
    private parseDate;
}
