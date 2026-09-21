import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
import { EmailCampaignAudience, EnrollmentStatus } from '@prisma/client';
import { BroadcastEmailDto, SendTestEmailDto } from './dto/email-campaign.dto';

@Injectable()
export class EmailCampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendBroadcast(adminUserId: string, payload: BroadcastEmailDto) {
    let recipientEmails: string[] = [];

    if (payload.audienceType === EmailCampaignAudience.ALL_USERS) {
      const users = await this.prisma.user.findMany({
        where: { isBlocked: false },
        select: { email: true },
      });
      recipientEmails = users.map((u) => u.email).filter(Boolean);
    } else if (payload.audienceType === EmailCampaignAudience.COURSE_STUDENTS) {
      if (!payload.targetCourseId) {
        throw new BadRequestException('নির্দিষ্ট কোর্স নির্বাচন করতে হবে!');
      }

      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          courseId: payload.targetCourseId,
          status: EnrollmentStatus.APPROVED,
        },
        select: { studentEmail: true },
      });

      recipientEmails = Array.from(
        new Set(enrollments.map((e) => e.studentEmail).filter(Boolean)),
      );
    } else if (payload.audienceType === EmailCampaignAudience.CUSTOM_EMAILS) {
      if (!payload.customEmails || payload.customEmails.length === 0) {
        throw new BadRequestException('কমপক্ষে একটি বৈধ ইমেইল অ্যাড্রেস দিতে হবে!');
      }
      recipientEmails = Array.from(
        new Set(payload.customEmails.map((e) => e.trim().toLowerCase())),
      );
    }

    if (recipientEmails.length === 0) {
      throw new BadRequestException('নির্বাচিত অডিয়েন্সে কোনো প্রাপক পাওয়া যায়নি!');
    }

    // Queue email jobs
    for (const email of recipientEmails) {
      this.queueService
        .addEmailJob({
          to: email,
          subject: payload.subject,
          template: 'PROMOTIONAL_CUSTOM',
          context: {
            heading: payload.heading,
            body: payload.body,
            preheader: payload.preheader,
            ctaButtonText: payload.ctaButtonText,
            ctaButtonUrl: payload.ctaButtonUrl,
          },
        })
        .catch(() => {});
    }

    const campaign = await this.prisma.emailCampaignLog.create({
      data: {
        subject: payload.subject,
        preheader: payload.preheader,
        heading: payload.heading,
        body: payload.body,
        ctaButtonText: payload.ctaButtonText,
        ctaButtonUrl: payload.ctaButtonUrl,
        audienceType: payload.audienceType,
        targetCourseId: payload.targetCourseId,
        recipientCount: recipientEmails.length,
        sentById: adminUserId,
      },
    });

    return {
      campaign,
      totalQueued: recipientEmails.length,
      message: `ক্যাম্পেইন সফলভাবে শুরু হয়েছে। মোট ${recipientEmails.length} জন গ্রাহকের কাছে ইমেইল পাঠানো হচ্ছে।`,
    };
  }

  async sendTestEmail(payload: SendTestEmailDto) {
    const adminEmail = this.configService.get<string>('admin.email') || 'admin@shunnoacademy.com';
    const targetEmail = payload.testEmail?.trim() || adminEmail;

    await this.emailService.sendCampaignEmail({
      to: targetEmail,
      subject: `[TEST PREVIEW] ${payload.subject}`,
      heading: payload.heading,
      body: payload.body,
      ctaButtonText: payload.ctaButtonText,
      ctaButtonUrl: payload.ctaButtonUrl,
    });

    return {
      message: `টেস্ট ইমেইলটি সফলভাবে "${targetEmail}" ঠিকানায় পাঠানো হয়েছে। আপনার ইনবক্স চেক করুন।`,
      targetEmail,
    };
  }

  async getCampaignHistory() {
    return this.prisma.emailCampaignLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getEmailStats() {
    const [totalCampaigns, totalRecipientsAgg, allUsersCount] = await Promise.all([
      this.prisma.emailCampaignLog.count(),
      this.prisma.emailCampaignLog.aggregate({
        _sum: { recipientCount: true },
      }),
      this.prisma.user.count(),
    ]);

    return {
      totalCampaigns,
      totalDeliveredRecipients: totalRecipientsAgg._sum.recipientCount || 0,
      totalSubscribers: allUsersCount,
    };
  }
}
