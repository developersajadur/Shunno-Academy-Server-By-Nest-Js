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
import { MentorService } from './mentor.service';
import { CreateMentorDto, UpdateMentorDto } from './dto/mentor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Mentors')
@Controller('mentors')
export class MentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all mentors (Cached)' })
  async getAll() {
    const result = await this.mentorService.getAll();
    return {
      message: 'Mentors retrieved successfully',
      data: result,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get mentor profile by ID' })
  async getById(@Param('id') id: string) {
    const result = await this.mentorService.getById(id);
    return {
      message: 'Mentor retrieved successfully',
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create mentor profile (Admin only)' })
  async create(
    @Body() dto: CreateMentorDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.mentorService.create(dto);
    return {
      message: 'Mentor created successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mentor profile (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateMentorDto) {
    const result = await this.mentorService.update(id, dto);
    return {
      message: 'Mentor updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete mentor profile (Admin only)' })
  async delete(@Param('id') id: string) {
    const result = await this.mentorService.delete(id);
    return {
      message: 'Mentor deleted successfully',
      data: result,
    };
  }
}
