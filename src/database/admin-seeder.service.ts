import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger('AdminSeeder');

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  async seedAdmin(): Promise<void> {
    try {
      const adminConfig = this.configService.get('admin');
      const saltRounds = this.configService.get<number>('saltRounds') || 12;

      if (!adminConfig?.email) {
        return;
      }

      const existingAdmin = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: adminConfig.email }, { role: UserRole.ADMIN }],
        },
      });

      if (existingAdmin) {
        return;
      }

      const hashedPassword = await bcrypt.hash(
        adminConfig.password || 'AdminPassword123!',
        saltRounds,
      );

      const admin = await this.prisma.user.create({
        data: {
          name: adminConfig.name || 'Shunno Admin',
          email: adminConfig.email,
          phone: adminConfig.phone || null,
          password: hashedPassword,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      this.logger.log(`👑 Super Admin account seeded successfully: ${admin.email}`);
    } catch (error: any) {
      this.logger.warn(`⚠️ Admin seeding notice: ${error.message}`);
    }
  }
}
