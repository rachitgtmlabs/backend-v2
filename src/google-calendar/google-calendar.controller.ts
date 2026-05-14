import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('v1/calendar')
export class GoogleCalendarController {
  constructor(private readonly calendarService: GoogleCalendarService) {}

  @Post('events')
  @HttpCode(200)
  async createEvent(@Body() dto: CreateCalendarEventDto) {
    const result = await this.calendarService.createEvent({
      title: dto.title,
      date: dto.date,
      description: dto.description,
      attendeeEmail: dto.attendeeEmail,
    });

    return {
      enabled: this.calendarService.isEnabled(),
      event: result,
    };
  }
}
