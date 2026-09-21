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
import { CourseService } from './course.service';
import { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all courses with search, filters and pagination' })
  async getAllCourses(@Query() query: CourseQueryDto) {
    const result = await this.courseService.getAllCourses(query);
    return {
      message: 'Courses retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get course details by slug or ID' })
  async getCourseBySlug(@Param('slug') slug: string) {
    const result = await this.courseService.getCourseBySlug(slug);
    return {
      message: 'Course retrieved successfully',
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  async createCourse(
    @Body() dto: CreateCourseDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.courseService.createCourse(dto);
    return {
      message: 'Course created successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course details (Admin only)' })
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const result = await this.courseService.updateCourse(id, dto);
    return {
      message: 'Course updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course (Admin only)' })
  async deleteCourse(@Param('id') id: string) {
    const result = await this.courseService.deleteCourse(id);
    return {
      message: 'Course deleted successfully',
      data: result,
    };
  }
}
