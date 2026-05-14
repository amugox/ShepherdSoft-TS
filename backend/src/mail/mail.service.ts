import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type { AppConfig } from '../config/configuration';

export interface MailMessage {
  to: string;
  toName?: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const cfg = config.get('mail', { infer: true });
    this.fromName = cfg.fromName;
    this.fromEmail = cfg.fromEmail;
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      requireTLS: cfg.useSsl,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }

  async send(msg: MailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: msg.toName ? `"${msg.toName}" <${msg.to}>` : msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    } catch (err) {
      this.log.error('Failed to send mail', err as Error);
    }
  }
}
