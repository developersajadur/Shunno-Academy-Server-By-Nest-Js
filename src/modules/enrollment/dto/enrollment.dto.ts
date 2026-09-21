import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus, PaymentMethod } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class EnrollmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ example: 'মোঃ সাজাদুর রহমান' })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: '01700000000' })
  @IsString()
  @IsNotEmpty()
  studentPhone: string;

  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @IsNotEmpty()
  studentEmail: string;

  @ApiProperty({ example: 'ঢাকা' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ example: 'শিক্ষার্থী' })
  @IsString()
  @IsNotEmpty()
  occupation: string;

  @ApiProperty({ example: 'ব্যাচ ১: রাত ৯:০০ - ১১:০০' })
  @IsString()
  @IsNotEmpty()
  batchSchedule: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsOptional()
  @IsString()
  senderNumber?: string;

  @ApiPropertyOptional({ example: 'TRX12345678' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentRemarks?: string;
}

export class UpdateEnrollmentStatusDto {
  @ApiProperty({ enum: EnrollmentStatus })
  @IsEnum(EnrollmentStatus)
  status: EnrollmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
