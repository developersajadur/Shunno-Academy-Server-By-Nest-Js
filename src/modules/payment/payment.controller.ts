import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { PaymentQueryDto, SubmitTrxDto, VerifyPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('submit-trx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit manual payment Transaction ID (bKash, Nagad, Rocket, Upay, Bank)' })
  async submitTrx(
    @Body() dto: SubmitTrxDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.paymentService.submitTrx(dto);
    return {
      message: 'পেমেন্ট ট্রানজেকশন সফলভাবে জমা দেওয়া হয়েছে। যাচাইকরণ চলমান রয়েছে।',
      data: result,
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments list with filters (Admin/Staff)' })
  async getAllPaymentsAdmin(@Query() query: PaymentQueryDto) {
    const result = await this.paymentService.getAllPaymentsAdmin(query);
    return {
      message: 'Payments list retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin alias: Get all payments list' })
  async getAllPaymentsAdminAlias(@Query() query: PaymentQueryDto) {
    const result = await this.paymentService.getAllPaymentsAdmin(query);
    return {
      message: 'Payments list retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Root GET alias: Get all payments list' })
  async getPaymentsRoot(@Query() query: PaymentQueryDto) {
    const result = await this.paymentService.getAllPaymentsAdmin(query);
    return {
      message: 'Payments list retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify & approve payment TrxID (Admin/Staff)' })
  async verifyPaymentAdmin(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    const result = await this.paymentService.verifyPaymentAdmin(id, admin.userId, dto);
    return {
      message: `Payment status updated to ${dto.status}`,
      data: result,
    };
  }
}
