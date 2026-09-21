import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, CourseMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CourseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: CourseMode })
  @IsOptional()
  @IsEnum(CourseMode)
  mode?: CourseMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAdmin?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;
}

export class CreateCourseDto {
  @ApiProperty({ example: 'Mastering Digital Marketing' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'মাস্টারিং ডিজিটাল মার্কেটিং' })
  @IsOptional()
  @IsString()
  bengaliTitle?: string;

  @ApiProperty({ example: 'mastering-digital-marketing' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ enum: CourseMode, default: CourseMode.Online })
  @IsOptional()
  @IsEnum(CourseMode)
  mode?: CourseMode = CourseMode.Online;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  priceBDT: number;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @IsNumber()
  originalPriceBDT?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  thumbnail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  introVideoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  liveClassUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  liveClassSchedule?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLiveClassActive?: boolean;

  @ApiPropertyOptional({ default: 'from-blue-600 to-cyan-500' })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mentorId?: string;

  @ApiProperty({ example: '৪ মাস' })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  totalLectures?: number;

  @ApiPropertyOptional({ default: 5.0 })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  totalStudents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ enum: CourseLevel, default: CourseLevel.ALL_LEVELS })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ default: 'বাংলা' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  enrollmentDeadline?: string | Date;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEnrollmentClosed?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  overview: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  learningOutcomes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  requirements?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  faqs?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  modules?: any[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bengaliTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: CourseMode })
  @IsOptional()
  @IsEnum(CourseMode)
  mode?: CourseMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceBDT?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originalPriceBDT?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  introVideoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  liveClassUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  liveClassSchedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLiveClassActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mentorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalLectures?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalStudents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  enrollmentDeadline?: string | Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnrollmentClosed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  learningOutcomes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  requirements?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  faqs?: any;
}
