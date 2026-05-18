import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('calendar')
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(private readonly calendarService: GoogleCalendarService) {}

  @Post('events')
  @HttpCode(200)
  async createEvent(@Body() dto: CreateCalendarEventDto) {
    try {
      const result = await this.calendarService.createEvent({
        title: dto.title,
        date: dto.date,
        description: dto.description,
        attendeeEmail: dto.attendeeEmail,
      });

      return {
        enabled: this.calendarService.isEnabled(),
        event: result,
        error: null,
      };
    } catch (err: any) {
      this.logger.error(`Calendar event creation failed: ${err.message}`);
      return {
        enabled: this.calendarService.isEnabled(),
        event: null,
        error: err.message ?? 'Unknown error creating calendar event',
      };
    }
  }
}
