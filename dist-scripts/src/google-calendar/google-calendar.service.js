"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleCalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const nodemailer = __importStar(require("nodemailer"));
const DEFAULT_ATTENDEE_EMAIL = '';
let GoogleCalendarService = GoogleCalendarService_1 = class GoogleCalendarService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GoogleCalendarService_1.name);
        const raw = config.get('GOOGLE_CALENDAR_ENABLED') ?? 'true';
        this.enabled = raw.trim().toLowerCase() !== 'false';
        this.attendeeEmail =
            config.get('GOOGLE_CALENDAR_ATTENDEE_EMAIL') || DEFAULT_ATTENDEE_EMAIL;
        const smtpHost = config.get('SMTP_HOST');
        const smtpPort = parseInt(config.get('SMTP_PORT') ?? '587', 10);
        this.smtpUser = config.get('SMTP_USER') ?? '';
        const smtpPass = config.get('SMTP_PASS') ?? '';
        if (smtpHost && this.smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: this.smtpUser, pass: smtpPass },
            });
            this.logger.log(`SMTP transport configured (${smtpHost}:${smtpPort})`);
        }
        else {
            this.transporter = null;
            this.logger.warn('SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Calendar invites will not be sent.');
        }
    }
    isEnabled() {
        return this.enabled && this.transporter !== null;
    }
    async createEvent(input) {
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
        const uid = (0, crypto_1.randomUUID)();
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
        }
        catch (err) {
            this.logger.error(`Failed to send calendar invite: ${err.message}`);
            throw new Error(`Failed to send calendar invite: ${err.message}`);
        }
    }
    buildIcs(opts) {
        const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const fmtDate = (d) => d.toISOString().split('T')[0].replace(/-/g, '');
        const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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
    parseDate(raw) {
        const trimmed = raw?.trim() ?? '';
        if (!trimmed) {
            throw new common_1.BadRequestException('date is required');
        }
        const parsed = new Date(trimmed);
        if (isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Could not parse date "${raw}" — expected ISO 8601 (YYYY-MM-DD) or "Month DD, YYYY"`);
        }
        return parsed;
    }
};
exports.GoogleCalendarService = GoogleCalendarService;
exports.GoogleCalendarService = GoogleCalendarService = GoogleCalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleCalendarService);
//# sourceMappingURL=google-calendar.service.js.map