import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';

// Core & Infrastructure Modules
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { QueueModule } from './queue/queue.module';

// Domain Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CategoryModule } from './modules/category/category.module';
import { CourseModule } from './modules/course/course.module';
import { CourseModuleModule } from './modules/course-module/course-module.module';
import { MentorModule } from './modules/mentor/mentor.module';
import { ReviewModule } from './modules/review/review.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { PaymentModule } from './modules/payment/payment.module';
import { InquiryModule } from './modules/inquiry/inquiry.module';
import { StatModule } from './modules/stat/stat.module';
import { UploadModule } from './modules/upload/upload.module';
import { EmailCampaignModule } from './modules/email-campaign/email-campaign.module';
import { EmployeeModule } from './modules/employee/employee.module';

// System & Bootstrap
import { AppController } from './app.controller';
import { AdminSeederService } from './database/admin-seeder.service';
import { KeepAliveService } from './common/services/keep-alive.service';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate Limiting (120 req/min globally)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),

    // Global Infrastructure
    PrismaModule,
    RedisModule,
    StorageModule,
    EmailModule,
    QueueModule,

    // Domain Features
    AuthModule,
    UserModule,
    CategoryModule,
    CourseModule,
    CourseModuleModule,
    MentorModule,
    ReviewModule,
    EnrollmentModule,
    PaymentModule,
    InquiryModule,
    StatModule,
    UploadModule,
    EmailCampaignModule,
    EmployeeModule,
  ],
  controllers: [AppController],
  providers: [
    AdminSeederService,
    KeepAliveService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
