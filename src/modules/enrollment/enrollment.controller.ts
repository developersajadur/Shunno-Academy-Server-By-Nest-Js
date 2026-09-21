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
import { EnrollmentService } from './enrollment.service';
import {
  EnrollmentQueryDto,
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
} from './dto/enrollment.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit student enrollment info & batch schedule' })
  async createEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEnrollmentDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.enrollmentService.createEnrollment(user?.userId, dto);
    return {
      message: 'Enrollment submitted successfully with Order ID!',
      data: result,
    };
  }

  @Public()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get enrollment status & details by Order ID' })
  async getEnrollmentByOrderId(@Param('orderId') orderId: string) {
    const result = await this.enrollmentService.getEnrollmentByOrderId(orderId);
    return {
      message: 'Enrollment retrieved successfully',
      data: result,
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve logged-in student enrollments' })
  async getMyEnrollments(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.enrollmentService.getMyEnrollments(user.userId);
    return {
      message: 'My enrollments retrieved successfully',
      data: result,
    };
  }

  @Get('check/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check student enrollment status for a specific course' })
  async checkEnrollmentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    const result = await this.enrollmentService.checkEnrollmentStatus(user.userId, courseId);
    return {
      message: 'Enrollment status checked',
      data: result,
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all enrollments with filters & pagination (Admin/Staff)' })
  async getAllEnrollmentsAdmin(@Query() query: EnrollmentQueryDto) {
    const result = await this.enrollmentService.getAllEnrollmentsAdmin(query);
    return {
      message: 'Enrollments retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin alias: List all enrollments' })
  async getAllEnrollmentsAdminAlias(@Query() query: EnrollmentQueryDto) {
    const result = await this.enrollmentService.getAllEnrollmentsAdmin(query);
    return {
      message: 'Enrollments retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Root GET alias: List all enrollments (Admin/Staff)' })
  async getEnrollmentsRoot(@Query() query: EnrollmentQueryDto) {
    const result = await this.enrollmentService.getAllEnrollmentsAdmin(query);
    return {
      message: 'Enrollments retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update enrollment status (Admin approve/reject)' })
  async updateEnrollmentStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    const result = await this.enrollmentService.updateEnrollmentStatus(id, admin.userId, dto);
    return {
      message: `Enrollment status updated to ${dto.status}`,
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete enrollment (Admin/Staff)' })
  async deleteEnrollment(@Param('id') id: string) {
    const result = await this.enrollmentService.deleteEnrollment(id);
    return {
      message: 'Enrollment deleted successfully',
      data: result,
    };
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin alias: Delete enrollment' })
  async deleteEnrollmentAdmin(@Param('id') id: string) {
    const result = await this.enrollmentService.deleteEnrollment(id);
    return {
      message: 'Enrollment deleted successfully',
      data: result,
    };
  }
}
