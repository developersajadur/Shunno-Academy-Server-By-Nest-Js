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
import { ReviewService } from './review.service';
import { ReviewQueryDto, CreateReviewDto, ApproveReviewDto } from './dto/review.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retrieve approved student reviews (Cached)' })
  async getApprovedReviews(@Query('courseId') courseId?: string) {
    const result = await this.reviewService.getApprovedReviews(courseId);
    return {
      message: 'Reviews retrieved successfully',
      data: result,
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all reviews including unapproved (Admin only)' })
  async getAllReviewsAdmin(@Query() query: ReviewQueryDto) {
    const result = await this.reviewService.getAllReviewsAdmin(query);
    return {
      message: 'All reviews retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin alias: Retrieve all reviews' })
  async getAllReviewsAdminAlias(@Query() query: ReviewQueryDto) {
    const result = await this.reviewService.getAllReviewsAdmin(query);
    return {
      message: 'All reviews retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Submit a new student review' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.reviewService.createReview(user?.userId, dto);
    return {
      message: 'Review submitted successfully',
      data: result,
    };
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or feature review (Admin only)' })
  async updateApproval(
    @Param('id') id: string,
    @Body() dto: ApproveReviewDto,
  ) {
    const result = await this.reviewService.updateApproval(id, dto);
    return {
      message: 'Review status updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete review (Admin only)' })
  async deleteReview(@Param('id') id: string) {
    const result = await this.reviewService.deleteReview(id);
    return {
      message: 'Review deleted successfully',
      data: result,
    };
  }
}
