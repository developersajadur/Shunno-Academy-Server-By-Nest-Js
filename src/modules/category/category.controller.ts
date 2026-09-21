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
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  async getAll() {
    const result = await this.categoryService.getAll();
    return {
      message: 'Categories retrieved successfully',
      data: result,
    };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async getBySlug(@Param('slug') slug: string) {
    const result = await this.categoryService.getBySlug(slug);
    return {
      message: 'Category retrieved successfully',
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category (Admin only)' })
  async create(@Body() dto: CreateCategoryDto, @Res({ passthrough: true }) res: Response) {
    res.status(HttpStatus.CREATED);
    const result = await this.categoryService.create(dto);
    return {
      message: 'Category created successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category by ID (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const result = await this.categoryService.update(id, dto);
    return {
      message: 'Category updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category by ID (Admin only)' })
  async delete(@Param('id') id: string) {
    const result = await this.categoryService.delete(id);
    return {
      message: 'Category deleted successfully',
      data: result,
    };
  }
}
