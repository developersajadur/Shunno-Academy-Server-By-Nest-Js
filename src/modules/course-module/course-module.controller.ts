import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CourseModuleService } from './course-module.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateLectureDto,
  UpdateLectureDto,
} from './dto/course-module.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Course Modules & Lectures')
@Controller('course-modules')
export class CourseModuleController {
  constructor(private readonly courseModuleService: CourseModuleService) {}

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get course curriculum and lectures with access verification' })
  async getModulesByCourseId(
    @Param('courseId') courseId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.courseModuleService.getModulesByCourseId(
      courseId,
      user?.userId,
      user?.role,
    );
    return {
      message: 'Course modules retrieved successfully',
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new course module (Admin/Staff)' })
  async createModule(
    @Body() dto: CreateModuleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.courseModuleService.createModule(dto);
    return {
      message: 'Module created successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course module (Admin/Staff)' })
  async updateModule(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    const result = await this.courseModuleService.updateModule(id, dto);
    return {
      message: 'Module updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course module (Admin/Staff)' })
  async deleteModule(@Param('id') id: string) {
    const result = await this.courseModuleService.deleteModule(id);
    return {
      message: result.message,
      data: null,
    };
  }

  @Post('lectures')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new course lecture (Admin/Staff)' })
  async createLecture(
    @Body() dto: CreateLectureDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.courseModuleService.createLecture(dto);
    return {
      message: 'Lecture created successfully',
      data: result,
    };
  }

  @Patch('lectures/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course lecture (Admin/Staff)' })
  async updateLecture(
    @Param('id') id: string,
    @Body() dto: UpdateLectureDto,
  ) {
    const result = await this.courseModuleService.updateLecture(id, dto);
    return {
      message: 'Lecture updated successfully',
      data: result,
    };
  }

  @Delete('lectures/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course lecture (Admin/Staff)' })
  async deleteLecture(@Param('id') id: string) {
    const result = await this.courseModuleService.deleteLecture(id);
    return {
      message: result.message,
      data: null,
    };
  }
}
