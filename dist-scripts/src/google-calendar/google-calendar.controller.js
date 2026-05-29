"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GoogleCalendarController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarController = void 0;
const common_1 = require("@nestjs/common");
const create_calendar_event_dto_1 = require("./dto/create-calendar-event.dto");
const google_calendar_service_1 = require("./google-calendar.service");
let GoogleCalendarController = GoogleCalendarController_1 = class GoogleCalendarController {
    constructor(calendarService) {
        this.calendarService = calendarService;
        this.logger = new common_1.Logger(GoogleCalendarController_1.name);
    }
    async createEvent(dto) {
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
        }
        catch (err) {
            this.logger.error(`Calendar event creation failed: ${err.message}`);
            return {
                enabled: this.calendarService.isEnabled(),
                event: null,
                error: err.message ?? 'Unknown error creating calendar event',
            };
        }
    }
};
exports.GoogleCalendarController = GoogleCalendarController;
__decorate([
    (0, common_1.Post)('events'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_calendar_event_dto_1.CreateCalendarEventDto]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "createEvent", null);
exports.GoogleCalendarController = GoogleCalendarController = GoogleCalendarController_1 = __decorate([
    (0, common_1.Controller)('calendar'),
    __metadata("design:paramtypes", [google_calendar_service_1.GoogleCalendarService])
], GoogleCalendarController);
//# sourceMappingURL=google-calendar.controller.js.map