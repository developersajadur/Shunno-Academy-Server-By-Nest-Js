import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class InquiryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InquiryStatus })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}

export class CreateInquiryDto {
  @ApiProperty({ example: 'Mohammad Ali' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '01700000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'ডিজিটাল মার্কেটিং কোর্সের তথ্য জানতে চাই' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'কোর্স ফি এবং ক্লাস সময়সূচী সম্পর্কে বিস্তারিত জানতে চাচ্ছি।' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interestedCourseId?: string;
}

export class UpdateInquiryStatusDto {
  @ApiProperty({ enum: InquiryStatus })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;
}
