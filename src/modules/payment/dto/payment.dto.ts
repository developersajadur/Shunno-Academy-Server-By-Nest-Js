import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}

export class SubmitTrxDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BKASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '01700000000' })
  @IsString()
  @IsNotEmpty()
  senderNumber: string;

  @ApiProperty({ example: 'BLA849204A' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentRemarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.VERIFIED })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentRemarks?: string;
}
