import { ConfigService } from '@nestjs/config';
export interface SendMailInput {
    to: string | string[];
    subject: string;
    html: string;
    text: string;
}
export declare class MailService {
    private readonly logger;
    private readonly transporter;
    private readonly fromUser;
    constructor(config: ConfigService);
    isEnabled(): boolean;
    send(input: SendMailInput): Promise<boolean>;
}
