import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Thin wrapper over nodemailer, configured from the same SMTP_* env vars the
 * calendar service already uses (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS).
 * Shared so any module can send transactional email without re-wiring a
 * transport. No-ops with a warning when SMTP isn't configured.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromUser: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = parseInt(config.get<string>('SMTP_PORT') ?? '587', 10);
    this.fromUser = config.get<string>('SMTP_USER') ?? '';
    const pass = config.get<string>('SMTP_PASS') ?? '';

    if (host && this.fromUser && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: this.fromUser, pass },
      });
      this.logger.log(`SMTP transport configured (${host}:${port})`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will not be sent.',
      );
    }
  }

  isEnabled(): boolean {
    return this.transporter !== null;
  }

  /** Send one message. Returns true if accepted by the transport, false when
   * SMTP is unconfigured. Throws only on an actual send failure. */
  async send(input: SendMailInput): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`No SMTP transport — skipping email "${input.subject}".`);
      return false;
    }
    await this.transporter.sendMail({
      from: `LeaseIQ <${this.fromUser}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  }
}
