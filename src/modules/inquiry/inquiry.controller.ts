import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InquiryService } from './inquiry.service';
import { InquiryQueryDto, CreateInquiryDto, UpdateInquiryStatusDto } from './dto/inquiry.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Inquiries')
@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Submit public contact form / course counseling inquiry' })
  async createInquiry(
    @Body() dto: CreateInquiryDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.inquiryService.createInquiry(user?.userId, dto);
    return {
      message: 'আপনার বার্তা সফলভাবে গ্রহণ করা হয়েছে। ধন্যবাদ!',
      data: result,
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contact inquiries (Admin/Staff)' })
  async getAllInquiriesAdmin(@Query() query: InquiryQueryDto) {
    const result = await this.inquiryService.getAllInquiriesAdmin(query);
    return {
      message: 'Inquiries retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin alias: Get all contact inquiries' })
  async getAllInquiriesAdminAlias(@Query() query: InquiryQueryDto) {
    const result = await this.inquiryService.getAllInquiriesAdmin(query);
    return {
      message: 'Inquiries retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inquiry status (Admin/Staff)' })
  async updateInquiryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    const result = await this.inquiryService.updateInquiryStatus(id, dto.status);
    return {
      message: `Inquiry status updated to ${dto.status}`,
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete inquiry (Admin only)' })
  async deleteInquiry(@Param('id') id: string) {
    const result = await this.inquiryService.deleteInquiry(id);
    return {
      message: 'Inquiry deleted successfully',
      data: result,
    };
  }
}
