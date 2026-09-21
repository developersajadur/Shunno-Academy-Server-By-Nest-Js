import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { EmailTemplateService } from './email.templates';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.verifyConnection();
  }

  getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const smtpUser = this.configService.get<string>('email.smtpUser');
    const smtpPass = this.configService.get<string>('email.smtpPass');
    const smtpHost = this.configService.get<string>('email.smtpHost') || 'smtp.gmail.com';
    const smtpPort = this.configService.get<number>('email.smtpPort') || 587;
    const smtpSecure = this.configService.get<boolean>('email.smtpSecure') || false;

    const hasCredentials = Boolean(smtpUser && smtpPass);

    if (hasCredentials) {
      const isGmail =
        smtpHost.toLowerCase().includes('gmail') ||
        (smtpUser && smtpUser.toLowerCase().includes('@gmail.com'));

      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateLimit: 10,
          tls: {
            rejectUnauthorized: false,
          },
        });
        this.logger.log(`📧 Gmail Service transporter initialized for "${smtpUser}"`);
      } else {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        this.logger.log(`📧 SMTP transporter configured with host: ${smtpHost}:${smtpPort}`);
      }
    } else {
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      this.logger.log('📧 Nodemailer simulated stream transporter active (No SMTP credentials)');
    }

    return this.transporter;
  }

  async verifyConnection(): Promise<boolean> {
    const resendApiKey = this.configService.get<string>('email.resendApiKey');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const smtpUser = this.configService.get<string>('email.smtpUser');
    const smtpPass = this.configService.get<string>('email.smtpPass');

    // 1. Resend HTTPS API
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/api-keys', {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
          },
        });
        if (response.ok) {
          this.logger.log(
            `✅ [Resend HTTPS API] Cloud Email Service active for "${fromEmail}"`,
          );
          return true;
        } else {
          this.logger.warn(`⚠️ [Resend HTTPS API] Auth check status: ${response.status}`);
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ [Resend HTTPS API] Verification notice: ${err.message}`);
      }
    }

    // 2. SMTP Check
    if (!smtpUser || !smtpPass) {
      this.logger.warn('⚠️ SMTP credentials not set. Emails will be logged in simulated mode.');
      return false;
    }

    try {
      const t = this.getTransporter();
      await Promise.race([
        t.verify(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'SMTP connection verification timed out after 8s (Raw ports blocked)',
                ),
              ),
            8000,
          ),
        ),
      ]);
      this.logger.log(`✅ [SMTP] Email server connection verified for "${smtpUser}"`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ [SMTP] Verification failed for "${smtpUser}": ${error.message}`);
      return false;
    }
  }

  async sendMail(options: SendMailOptions) {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const fromName = this.configService.get<string>('email.fromName') || 'Shunno Academy';
    const fromEmail = this.configService.get<string>('email.fromEmail') || 'shunnoacademy0@gmail.com';
    const fromHeader = options.from || `"${fromName}" <${fromEmail}>`;
    const resendApiKey = this.configService.get<string>('email.resendApiKey');

    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromHeader.includes('<') ? fromHeader : `${fromName} <${fromEmail}>`,
            to: recipients,
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        const data: any = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Resend API error: status ${res.status}`);
        }

        this.logger.log(
          `📬 [Resend HTTPS] Delivered "${options.subject}" to: ${recipients.join(', ')}`,
        );
        return { accepted: recipients, messageId: data.id, resend: true };
      } catch (err: any) {
        this.logger.warn(`⚠️ [Resend HTTPS Failed] ${err.message}. Trying SMTP...`);
      }
    }

    const transporter = this.getTransporter();
    const info = await transporter.sendMail({
      from: fromHeader,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    const hasCredentials = Boolean(
      this.configService.get<string>('email.smtpUser') &&
        this.configService.get<string>('email.smtpPass'),
    );
    if (!hasCredentials && (info as any).message) {
      this.logger.log(
        `📬 [SIMULATED EMAIL DISPATCH] To: ${recipients.join(', ')} | Subject: "${options.subject}"`,
      );
    }

    return info;
  }

  // High-level template helpers
  async sendOtpEmail(to: string, otpCode: string, name = 'শিক্ষার্থী') {
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const html = EmailTemplateService.getEmailVerificationHtml(
      {
        name,
        verifyUrl: `${clientUrl}/auth/verify-email?email=${encodeURIComponent(to)}&code=${otpCode}`,
        otpCode,
      },
      clientUrl,
      fromEmail,
    );

    return this.sendMail({
      to,
      subject: `আপনার ভেরিফিকেশন কোড: ${otpCode} - শুন্য একাডেমি`,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, name = 'শিক্ষার্থী') {
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const html = EmailTemplateService.getPasswordResetHtml(
      { name, resetUrl },
      clientUrl,
      fromEmail,
    );

    return this.sendMail({
      to,
      subject: 'পাসওয়ার্ড রিসেট নির্দেশিকা - শুন্য একাডেমি',
      html,
    });
  }

  async sendPaymentSubmittedEmail(params: {
    to: string;
    name: string;
    orderId: string;
    trxId: string;
    amount: number;
    courseTitle?: string;
  }) {
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const html = EmailTemplateService.getPaymentSubmittedHtml(
      params,
      clientUrl,
      fromEmail,
    );

    return this.sendMail({
      to: params.to,
      subject: `পেমেন্ট গ্রহণ নিশ্চিতকরণ [${params.orderId}] - শুন্য একাডেমি`,
      html,
    });
  }

  async sendEnrollmentApprovedEmail(params: {
    to: string;
    name: string;
    courseTitle: string;
    orderId: string;
    batchSchedule?: string;
  }) {
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const html = EmailTemplateService.getEnrollmentApprovedHtml(
      params,
      clientUrl,
      fromEmail,
    );

    return this.sendMail({
      to: params.to,
      subject: `ভর্তি অনুমোদন ও কোর্সে অ্যাক্সেস নিশ্চিতকরণ - ${params.courseTitle}`,
      html,
    });
  }

  async sendCampaignEmail(params: {
    to: string | string[];
    subject: string;
    heading: string;
    body: string;
    preheader?: string;
    ctaButtonText?: string;
    ctaButtonUrl?: string;
  }) {
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const html = EmailTemplateService.getPromotionalCustomHtml(
      params,
      clientUrl,
      fromEmail,
    );

    return this.sendMail({
      to: params.to,
      subject: params.subject,
      html,
    });
  }
}
