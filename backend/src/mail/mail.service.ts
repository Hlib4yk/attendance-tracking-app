import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  /** Default From when MAIL_FROM omitted */
  private readonly fallbackFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();

    if (smtpHost) {
      const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
      const secure = process.env.SMTP_SECURE === 'true';
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: user ? { user, pass: pass ?? '' } : undefined,
      });
      this.fallbackFrom = 'noreply@localhost';
      return;
    }

    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: { user: 'resend', pass: apiKey },
      });
      this.fallbackFrom = 'onboarding@resend.dev';
      this.logger.log('Using Resend SMTP (RESEND_API_KEY). Set MAIL_FROM to your verified domain when ready.');
      return;
    }

    this.transporter = null;
    this.fallbackFrom = 'noreply@localhost';
    this.logger.warn(
      'No RESEND_API_KEY or SMTP_HOST — teacher invite emails are skipped; API returns inviteUrl for manual forwarding',
    );
  }

  /** @returns true if message was handed to SMTP */
  async sendTeacherInvite(to: string, inviteUrl: string): Promise<boolean> {
    const from = process.env.MAIL_FROM?.trim() || this.fallbackFrom;
    const subject = 'Запрошення: реєстрація викладача';
    const text = [
      'Вас запрошено зареєструватися як викладач у системі присутності.',
      '',
      'Перейдіть за посиланням (діє обмежений час, одноразове):',
      inviteUrl,
      '',
      'Якщо ви не очікували цього листа, проігноруйте його.',
    ].join('\n');

    if (!this.transporter) {
      this.logger.log(`Invite for ${to} (mail off): ${inviteUrl}`);
      return false;
    }

    await this.transporter.sendMail({ from, to, subject, text });
    return true;
  }
}
