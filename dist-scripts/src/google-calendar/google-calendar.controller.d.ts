import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GoogleCalendarService } from './google-calendar.service';
export declare class GoogleCalendarController {
    private readonly calendarService;
    private readonly logger;
    constructor(calendarService: GoogleCalendarService);
    createEvent(dto: CreateCalendarEventDto): Promise<{
        enabled: boolean;
        event: import("./google-calendar.service").CalendarEventResult | null;
        error: null;
    } | {
        enabled: boolean;
        event: null;
        error: any;
    }>;
}
