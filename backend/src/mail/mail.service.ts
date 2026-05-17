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
  private readonly appName: string;
  private readonly appUrl: string;
  private readonly supportEmail: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const cfg = config.get('mail', { infer: true });
    this.fromName = cfg.fromName;
    this.fromEmail = cfg.fromEmail;
    this.appName = cfg.appName;
    this.appUrl = cfg.appUrl.trim();
    this.supportEmail = cfg.supportEmail.trim();
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
    const textLines = [
      'A password reset was requested for your account.',
      `Reset code: ${payload.code}`,
      `This code expires in ${payload.expiresInMin} minutes.`,
      'If you did not request this, ignore this email.',
      ...this.textContactLines(),
    ];
    return this.send({
      to: payload.to,
      toName: payload.toName,
      subject: 'Your ShepherdSoft password reset code',
      text: textLines.join('\n'),
      html: this.buildAuthCodeTemplate({
        title: 'Password Reset Request',
        intro: 'A password reset was requested for your account.',
        codeLabel: 'Reset code',
        code: payload.code,
        expiresInMin: payload.expiresInMin,
        actionNote: 'If you did not request this, ignore this email.',
        toName: payload.toName,
      }),
    });
  }

  async sendOtpCode(payload: OtpMailPayload): Promise<boolean> {
    const textLines = [
      'Use this one-time code to complete sign-in.',
      `Verification code: ${payload.code}`,
      `This code expires in ${payload.expiresInMin} minutes.`,
      ...this.textContactLines(),
    ];
    return this.send({
      to: payload.to,
      toName: payload.toName,
      subject: 'Your ShepherdSoft login verification code',
      text: textLines.join('\n'),
      html: this.buildAuthCodeTemplate({
        title: 'Sign-in Verification',
        intro: 'Use this one-time code to complete sign-in.',
        codeLabel: 'Verification code',
        code: payload.code,
        expiresInMin: payload.expiresInMin,
        actionNote: 'For your security, never share this code with anyone.',
        toName: payload.toName,
      }),
    });
  }

  private buildAuthCodeTemplate(payload: {
    title: string;
    intro: string;
    codeLabel: string;
    code: string;
    expiresInMin: number;
    actionNote: string;
    toName?: string;
  }): string {
    const brandPrimary = '#1e3a5f';
    const brandTeal = '#2dd4bf';
    const brandGold = '#f59e0b';
    const neutralBg = '#f9fafb';
    const cardBorder = '#e2e8f0';
    const textMain = '#0f172a';
    const textSubtle = '#475569';
    const greetingName = this.escapeHtml(payload.toName?.trim() ? payload.toName : 'there');
    const appName = this.escapeHtml(this.appName);
    const title = this.escapeHtml(payload.title);
    const intro = this.escapeHtml(payload.intro);
    const codeLabel = this.escapeHtml(payload.codeLabel);
    const code = this.escapeHtml(payload.code);
    const actionNote = this.escapeHtml(payload.actionNote);
    const expires = this.escapeHtml(String(payload.expiresInMin));
    const supportEmail = this.escapeHtml(this.supportEmail);
    const appUrl = this.escapeHtml(this.appUrl);

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} notification</title>
  </head>
  <body style="margin:0;padding:0;background:${neutralBg};font-family:Inter,'Segoe UI',Arial,sans-serif;color:${textMain};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${title} for ${appName}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${neutralBg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid ${cardBorder};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:0;background:${brandPrimary};height:6px;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px 24px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:${brandTeal};">${appName}</div>
                <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.3;color:${brandPrimary};font-weight:700;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.6;color:${textSubtle};">
                <p style="margin:0 0 12px 0;">Hi ${greetingName},</p>
                <p style="margin:0;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${cardBorder};background:#f8fafc;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px 6px 16px;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:${textSubtle};">
                      ${codeLabel}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 16px 16px;font-size:32px;line-height:1.2;font-weight:800;letter-spacing:0.14em;color:${brandPrimary};">
                      ${code}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 12px 24px;font-size:14px;line-height:1.6;color:${textSubtle};">
                <p style="margin:0;">This code expires in <strong style="color:${brandGold};">${expires} minutes</strong>.</p>
                <p style="margin:12px 0 0 0;">${actionNote}</p>
              </td>
            </tr>
            ${this.appUrl ? `<tr>
              <td style="padding:0 24px 18px 24px;">
                <a href="${appUrl}" style="display:inline-block;background:${brandPrimary};border-radius:8px;padding:10px 16px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                  Open ${appName}
                </a>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding:14px 24px 22px 24px;border-top:1px solid ${cardBorder};font-size:12px;line-height:1.6;color:${textSubtle};">
                <p style="margin:0;">This is an automated message from ${appName}.</p>
                ${this.supportEmail ? `<p style="margin:6px 0 0 0;">Need help? Contact <a href="mailto:${supportEmail}" style="color:${brandPrimary};text-decoration:none;">${supportEmail}</a>.</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private textContactLines(): string[] {
    const lines: string[] = [];
    if (this.appUrl) {
      lines.push(`Open ${this.appName}: ${this.appUrl}`);
    }
    if (this.supportEmail) {
      lines.push(`Support: ${this.supportEmail}`);
    }
    return lines;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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
