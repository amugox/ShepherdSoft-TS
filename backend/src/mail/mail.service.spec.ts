import nodemailer from 'nodemailer';

import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailService', () => {
  const sendMail = jest.fn();
  const createTransport = jest.mocked(nodemailer.createTransport);

  const config = {
    get: jest.fn().mockReturnValue({
      host: 'smtp.example.com',
      port: 587,
      fromName: 'ShepherdSoft',
      fromEmail: 'noreply@example.com',
      user: 'smtp-user',
      pass: 'smtp-pass',
      useSsl: true,
      appName: 'ShepherdSoft',
      appUrl: 'https://app.example.com/auth',
      supportEmail: 'support@example.com',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({});
    createTransport.mockReturnValue({
      sendMail,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
  });

  it('sends OTP mail with branded HTML and escaped dynamic values', async () => {
    const service = new MailService(config as never);

    await service.sendOtpCode({
      to: 'user@example.com',
      toName: 'A <Admin>',
      code: '<123456>',
      expiresInMin: 10,
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(mail.subject).toBe('Your ShepherdSoft login verification code');
    expect(mail.text).toContain('Verification code: <123456>');
    expect(mail.text).toContain('Open ShepherdSoft: https://app.example.com/auth');
    expect(mail.html).toContain('Sign-in Verification');
    expect(mail.html).toContain('A &lt;Admin&gt;');
    expect(mail.html).toContain('&lt;123456&gt;');
    expect(mail.html).toContain('mailto:support@example.com');
    expect(mail.html).toContain('Open ShepherdSoft');
  });

  it('sends password reset mail with expected sections and fallback text', async () => {
    const service = new MailService(config as never);

    await service.sendPasswordResetCode({
      to: 'user@example.com',
      toName: 'Jane Doe',
      code: '987654',
      expiresInMin: 20,
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(mail.subject).toBe('Your ShepherdSoft password reset code');
    expect(mail.text).toContain('Reset code: 987654');
    expect(mail.text).toContain('If you did not request this, ignore this email.');
    expect(mail.html).toContain('Password Reset Request');
    expect(mail.html).toContain('Reset code');
    expect(mail.html).toContain('This code expires in');
    expect(mail.html).toContain('This is an automated message from ShepherdSoft.');
  });
});
