import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import {
  EMAIL_QUEUE_NAME,
  ENROLLMENT_QUEUE_NAME,
  EmailJobData,
  EnrollmentJobData,
} from './queue.constants';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private emailQueue: Queue<EmailJobData> | null = null;
  private enrollmentQueue: Queue<EnrollmentJobData> | null = null;
  private emailWorker: Worker<EmailJobData> | null = null;
  private enrollmentWorker: Worker<EnrollmentJobData> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getQueueConnection(): ConnectionOptions {
    const redisUrl = this.configService.get<string>('redis.url');
    if (redisUrl && redisUrl.startsWith('redis')) {
      try {
        const parsed = new URL(redisUrl);
        const isTls = parsed.protocol === 'rediss:';
        return {
          host: parsed.hostname,
          port: parseInt(parsed.port || '6379', 10),
          username: parsed.username || undefined,
          password: parsed.password || undefined,
          tls: isTls ? { rejectUnauthorized: false } : undefined,
          maxRetriesPerRequest: null,
        };
      } catch {
        // Fallback
      }
    }

    return {
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: null,
    };
  }

  onModuleInit() {
    const connection = this.getQueueConnection();

    try {
      this.emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      });

      this.enrollmentQueue = new Queue<EnrollmentJobData>(ENROLLMENT_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: true,
        },
      });

      this.initWorkers(connection);
      this.logger.log('⚡ BullMQ Queues and Workers initialized');
    } catch (err: any) {
      this.logger.warn(`⚠️ BullMQ init notice: ${err.message}`);
    }
  }

  private initWorkers(connection: ConnectionOptions) {
    try {
      const clientUrl = this.configService.get<string>('clientUrl');
      const fromEmail = this.configService.get<string>('email.fromEmail');

      this.emailWorker = new Worker<EmailJobData>(
        EMAIL_QUEUE_NAME,
        async (job: Job<EmailJobData>) => {
          const { to, subject, template, context } = job.data;
          this.logger.log(
            `📧 [BullMQ Email Worker] Processing job ${job.id} for: ${Array.isArray(to) ? to.join(',') : to}`,
          );

          let html = '';
          switch (template) {
            case 'EMAIL_VERIFICATION':
              html = EmailTemplateService.getEmailVerificationHtml(
                {
                  name: context.name || 'শিক্ষার্থী',
                  verifyUrl: context.verifyUrl || '#',
                  otpCode: context.otpCode,
                },
                clientUrl,
                fromEmail,
              );
              break;
            case 'PASSWORD_RESET':
              html = EmailTemplateService.getPasswordResetHtml(
                {
                  name: context.name || 'ব্যবহারকারী',
                  resetUrl: context.resetUrl || '#',
                },
                clientUrl,
                fromEmail,
              );
              break;
            case 'PAYMENT_SUBMITTED':
              html = EmailTemplateService.getPaymentSubmittedHtml(
                {
                  name: context.name || 'শিক্ষার্থী',
                  orderId: context.orderId || 'N/A',
                  trxId: context.trxId || 'N/A',
                  amount: context.amount || 0,
                  method: context.method,
                  courseTitle: context.courseTitle,
                },
                clientUrl,
                fromEmail,
              );
              break;
            case 'ENROLLMENT_APPROVED':
              html = EmailTemplateService.getEnrollmentApprovedHtml(
                {
                  name: context.name || 'শিক্ষার্থী',
                  courseTitle: context.courseTitle || context.course || 'কোর্স',
                  orderId: context.orderId || 'N/A',
                  batchSchedule: context.batchSchedule,
                },
                clientUrl,
                fromEmail,
              );
              break;
            case 'PROMOTIONAL_CUSTOM':
              html = EmailTemplateService.getPromotionalCustomHtml(
                {
                  heading: context.heading || subject,
                  body: context.body || '',
                  preheader: context.preheader,
                  ctaButtonText: context.ctaButtonText,
                  ctaButtonUrl: context.ctaButtonUrl,
                },
                clientUrl,
                fromEmail,
              );
              break;
            case 'WELCOME':
            default:
              html = EmailTemplateService.getPromotionalCustomHtml(
                {
                  heading: `শুন্য একাডেমিতে আপনাকে স্বাগতম, ${context.name || 'শিক্ষার্থী'}!`,
                  body: `আপনার শুন্য একাডেমি অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন থেকে আপনি আমাদের প্রিমিয়াম কোর্সসমূহ ব্রাউজ করতে ও ফ্রিল্যান্সিং ক্যারিয়ার শুরু করতে পারবেন।`,
                  ctaButtonText: 'কোর্সসমূহ দেখুন',
                  ctaButtonUrl: `${clientUrl}/courses`,
                },
                clientUrl,
                fromEmail,
              );
              break;
          }

          const result = await this.emailService.sendMail({ to, subject, html });
          return { sent: true, messageId: (result as any)?.messageId };
        },
        { connection, concurrency: 5 },
      );

      this.enrollmentWorker = new Worker<EnrollmentJobData>(
        ENROLLMENT_QUEUE_NAME,
        async (job: Job<EnrollmentJobData>) => {
          const { courseId, action } = job.data;
          this.logger.log(`🎓 [BullMQ Enrollment Worker] Handling ${action} for course ${courseId}`);

          if (action === 'APPROVED') {
            await this.prisma.course.update({
              where: { id: courseId },
              data: { totalStudents: { increment: 1 } },
            });

            await this.redisService.del(CACHE_KEYS.COURSES);
            await this.redisService.del(CACHE_KEYS.STATS);
          }

          return { processed: true };
        },
        { connection },
      );
    } catch (err: any) {
      this.logger.warn(`⚠️ BullMQ worker creation notice: ${err.message}`);
    }
  }

  async addEmailJob(data: EmailJobData) {
    if (this.emailQueue) {
      try {
        const job = await Promise.race([
          this.emailQueue.add(`email-${data.template}-${Date.now()}`, data),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Queue timeout, switching to direct dispatch')), 2000),
          ),
        ]);
        return job;
      } catch (err: any) {
        this.logger.log(`⚡ [Queue Fallback] ${err.message}. Sending email directly...`);
      }
    }

    // Direct fallback
    const clientUrl = this.configService.get<string>('clientUrl');
    const fromEmail = this.configService.get<string>('email.fromEmail');
    let html = '';
    if (data.template === 'EMAIL_VERIFICATION') {
      html = EmailTemplateService.getEmailVerificationHtml(
        {
          name: data.context.name || 'শিক্ষার্থী',
          verifyUrl: data.context.verifyUrl || '#',
          otpCode: data.context.otpCode,
        },
        clientUrl,
        fromEmail,
      );
    } else if (data.template === 'PASSWORD_RESET') {
      html = EmailTemplateService.getPasswordResetHtml(
        { name: data.context.name || 'ব্যবহারকারী', resetUrl: data.context.resetUrl || '#' },
        clientUrl,
        fromEmail,
      );
    } else {
      html = EmailTemplateService.getPromotionalCustomHtml(
        {
          heading: data.context.heading || data.subject,
          body: data.context.body || '',
          ctaButtonText: data.context.ctaButtonText,
          ctaButtonUrl: data.context.ctaButtonUrl,
        },
        clientUrl,
        fromEmail,
      );
    }

    return this.emailService.sendMail({ to: data.to, subject: data.subject, html });
  }

  async addEnrollmentJob(data: EnrollmentJobData) {
    if (this.enrollmentQueue) {
      try {
        return await this.enrollmentQueue.add(`enrollment-${data.action}-${data.enrollmentId}`, data);
      } catch {
        // Direct fallback
      }
    }

    if (data.action === 'APPROVED') {
      await this.prisma.course.update({
        where: { id: data.courseId },
        data: { totalStudents: { increment: 1 } },
      });
      await this.redisService.del(CACHE_KEYS.COURSES);
      await this.redisService.del(CACHE_KEYS.STATS);
    }
  }

  async onModuleDestroy() {
    if (this.emailWorker) await this.emailWorker.close();
    if (this.enrollmentWorker) await this.enrollmentWorker.close();
    if (this.emailQueue) await this.emailQueue.close();
    if (this.enrollmentQueue) await this.enrollmentQueue.close();
  }
}
