import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailCampaignAudience } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BroadcastEmailDto {
  @ApiProperty({ example: 'আমাদের নতুন কোর্স সমূহে বিশেষ ছাড়!' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preheader?: string;

  @ApiProperty({ example: 'প্রিমিয়াম ফ্রিল্যান্সিং স্কিল শিখুন ঘরে বসেই' })
  @IsString()
  @IsNotEmpty()
  heading: string;

  @ApiProperty({ example: 'কোর্সে ভর্তি সংক্রান্ত বিস্তারিত তথ্য...' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'এখনই এনরোল করুন' })
  @IsOptional()
  @IsString()
  ctaButtonText?: string;

  @ApiPropertyOptional({ example: 'https://shunnoacademy.com/courses' })
  @IsOptional()
  @IsString()
  ctaButtonUrl?: string;

  @ApiProperty({ enum: EmailCampaignAudience })
  @IsEnum(EmailCampaignAudience)
  audienceType: EmailCampaignAudience;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetCourseId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  customEmails?: string[];
}

export class SendTestEmailDto {
  @ApiPropertyOptional({ example: 'test@example.com' })
  @IsOptional()
  @IsString()
  testEmail?: string;

  @ApiProperty({ example: 'Test Subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Test Heading' })
  @IsString()
  @IsNotEmpty()
  heading: string;

  @ApiProperty({ example: 'Test message body...' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaButtonText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaButtonUrl?: string;
}
