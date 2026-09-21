import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { QueueService } from '../../queue/queue.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants';
import { UserRole, TokenType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CreateMentorDto, UpdateMentorDto } from './dto/mentor.dto';

@Injectable()
export class MentorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  async getAll() {
    return this.redis.getOrSet(
      CACHE_KEYS.MENTORS,
      async () => {
        return this.prisma.mentor.findMany({
          orderBy: { order: 'asc' },
          include: {
            courses: {
              where: { isPublished: true },
              select: {
                id: true,
                title: true,
                slug: true,
                mode: true,
              },
            },
          },
        });
      },
      CACHE_TTL.LONG,
    );
  }

  async getById(id: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { id },
      include: {
        courses: {
          where: { isPublished: true },
        },
      },
    });

    if (!mentor) {
      throw new NotFoundException('Teacher profile not found!');
    }

    return mentor;
  }

  async create(payload: CreateMentorDto) {
    const cleanEmail = payload.email?.toLowerCase().trim();

    if (cleanEmail) {
      let existingUser = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!existingUser) {
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const saltRounds = this.configService.get<number>('saltRounds') || 12;
        const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

        existingUser = await this.prisma.user.create({
          data: {
            name: payload.name.trim(),
            email: cleanEmail,
            phone: payload.phone?.trim() || null,
            password: hashedPassword,
            role: UserRole.INSTRUCTOR,
            avatar: payload.avatar,
            isEmailVerified: false,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.INSTRUCTOR,
            avatar: payload.avatar || existingUser.avatar,
          },
        });
      }

      const setupToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await this.prisma.emailToken.deleteMany({
        where: {
          email: cleanEmail,
          type: TokenType.PASSWORD_RESET,
        },
      });

      await this.prisma.emailToken.create({
        data: {
          email: cleanEmail,
          token: setupToken,
          type: TokenType.PASSWORD_RESET,
          expiresAt,
        },
      });

      const clientUrl = this.configService.get<string>('clientUrl');
      const setPasswordUrl = `${clientUrl}/set-password?token=${setupToken}`;

      this.queueService
        .addEmailJob({
          to: cleanEmail,
          subject: `[Shunno Academy] শিক্ষক প্যানেলে স্বাগতম - আপনার পাসওয়ার্ড সেট করুন`,
          template: 'PROMOTIONAL_CUSTOM',
          context: {
            heading: `শুন্য একাডেমি শিক্ষক প্যানেলে আপনাকে স্বাগতম!`,
            preheader: `আপনার শিক্ষক অ্যাকাউন্টের পাসওয়ার্ড সেট করুন`,
            body: `প্রিয় ${payload.name},\n\nশুন্য একাডেমিতে শিক্ষক/ইন্সট্রাক্টর হিসেবে আপনার অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে।\n\nআপনার শিক্ষক অ্যাকাউন্টের পাসওয়ার্ড সেট করতে নিচের বাটনে ক্লিক করুন। পাসওয়ার্ড সেট সম্পন্ন করার পর আপনি সরাসরি /teacher-login পেজে লগইন করে ক্লাস ও হোমওয়ার্ক পরিচালনা করতে পারবেন।`,
            ctaButtonText: 'পাসওয়ার্ড সেট করুন (Set Password)',
            ctaButtonUrl: setPasswordUrl,
          },
        })
        .catch(() => {});
    }

    const mentor = await this.prisma.mentor.create({
      data: {
        ...payload,
        email: cleanEmail || null,
      },
    });

    await this.redis.del(CACHE_KEYS.MENTORS);
    return mentor;
  }

  async update(id: string, payload: UpdateMentorDto) {
    const existing = await this.prisma.mentor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Teacher not found');
    }

    const cleanEmail = payload.email?.toLowerCase().trim() || existing.email;

    if (cleanEmail) {
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            name: payload.name || user.name,
            phone: payload.phone || user.phone,
            avatar: payload.avatar || user.avatar,
            role: UserRole.INSTRUCTOR,
          },
        });
      }
    }

    const mentor = await this.prisma.mentor.update({
      where: { id },
      data: payload,
    });

    await this.redis.del(CACHE_KEYS.MENTORS);
    return mentor;
  }

  async delete(id: string) {
    const mentor = await this.prisma.mentor.delete({
      where: { id },
    });
    await this.redis.del(CACHE_KEYS.MENTORS);
    return mentor;
  }
}
