import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rating?: number;
}

export class CreateReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ example: 'Mohammad Ali' })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiPropertyOptional({ example: 'Digital Marketer at Upwork' })
  @IsOptional()
  @IsString()
  studentTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentAvatar?: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'দারুণ অভিজ্ঞতা ছিল!' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;
}

export class ApproveReviewDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
