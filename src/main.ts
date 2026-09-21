import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, RequestMethod, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Trust proxy for reverse proxies (Render, Cloudflare, Vercel, Nginx)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI assets to load without issues
    }),
  );

  // Compression
  app.use(compression());

  // Body parsers with 10mb limit
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser
  app.use(cookieParser());

  // CORS configuration
  const clientUrl = configService.get<string>('clientUrl') || 'http://localhost:3000';
  app.enableCors({
    origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  // Global prefix for all API routes (except root /)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });

  // Swagger Documentation Setup
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Shunno Academy API Documentation')
      .setDescription(
        'Official REST API documentation for Shunno Academy (শূন্য একাডেমি) - Bangladesh Premier Online Skill & Tech Learning Platform.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token: Bearer <token>',
        },
        'bearerAuth',
      )
      .addTag('Auth', 'Student & Admin Authentication, Tokens, and Profile Management')
      .addTag('Courses', 'Course Catalog, Curriculum, Filtering, and Management')
      .addTag('Course Modules', 'Course Curriculum Modules & Lectures')
      .addTag('Categories', 'Course Categories')
      .addTag('Mentors', 'Mentor Profiles and Instructor Showcase')
      .addTag('Reviews', 'Student Testimonials & Reviews Approval Workflow')
      .addTag('Enrollments', 'Course Registration, Batch Selection, and Status Updates')
      .addTag('Payments', 'Manual Payment Verification (bKash, Nagad, Rocket, Upay, Bank, TrxID)')
      .addTag('Inquiries', 'Contact Forms & Counseling Requests')
      .addTag('Stats', 'Platform Milestones & Statistical Overview')
      .addTag('Upload', 'Cloudinary Image & Document Storage Service')
      .addTag('Email Campaigns', 'Broadcast Emails & Promotional Newsletters')
      .addTag('Employees', 'Affiliate / Staff Management & Verification')
      .addTag('System', 'Health & Status Endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Shunno Academy API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  const port = configService.get<number>('port') || 5000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Shunno Academy NestJS server running on port: ${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
