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

export interface PasswordResetMailPayload {
  to: string;
  toName?: string;
  code: string;
  expiresInMin: number;
}

export interface OtpMailPayload {
  to: string;
  toName?: string;
  code: string;
  expiresInMin: number;
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

  async send(msg: MailMessage): Promise<boolean> {
    return this.sendWithRetry(msg, 2);
  }

  async sendPasswordResetCode(payload: PasswordResetMailPayload): Promise<boolean> {
    return this.send({
      to: payload.to,
      toName: payload.toName,
      subject: 'Your ShepherdSoft password reset code',
      text: [
        'A password reset was requested for your account.',
        `Reset code: ${payload.code}`,
        `This code expires in ${payload.expiresInMin} minutes.`,
        'If you did not request this, ignore this email.',
      ].join('\n'),
      html: `
        <p>A password reset was requested for your account.</p>
        <p><strong>Reset code:</strong> ${payload.code}</p>
        <p>This code expires in <strong>${payload.expiresInMin} minutes</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });
  }

  async sendOtpCode(payload: OtpMailPayload): Promise<boolean> {
    return this.send({
      to: payload.to,
      toName: payload.toName,
      subject: 'Your ShepherdSoft login verification code',
      text: [
        'Use this one-time code to complete sign-in.',
        `Verification code: ${payload.code}`,
        `This code expires in ${payload.expiresInMin} minutes.`,
      ].join('\n'),
      html: `
        <p>Use this one-time code to complete sign-in.</p>
        <p><strong>Verification code:</strong> ${payload.code}</p>
        <p>This code expires in <strong>${payload.expiresInMin} minutes</strong>.</p>
      `,
    });
  }

  private async sendWithRetry(msg: MailMessage, retries: number): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: msg.toName ? `"${msg.toName}" <${msg.to}>` : msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        });
        return true;
      } catch (err) {
        if (attempt >= retries) {
          this.log.error('Failed to send mail after retries', err as Error);
          return false;
        }
        this.log.warn(`Mail send failed (attempt ${attempt + 1}/${retries + 1}); retrying...`);
      }
    }
    return false;
  }
}
