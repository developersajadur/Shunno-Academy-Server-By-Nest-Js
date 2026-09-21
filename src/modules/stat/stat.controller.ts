import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatService } from './stat.service';
import { AnalyticsQueryDto } from './dto/stat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stats & Analytics')
@Controller('stats')
export class StatController {
  constructor(private readonly statService: StatService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retrieve public platform stats (Cached)' })
  async getPlatformStats() {
    const result = await this.statService.getPlatformStats();
    return {
      message: 'Platform stats retrieved successfully',
      data: result,
    };
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve comprehensive admin dashboard analytics (Admin only)' })
  async getAdminAnalytics(@Query() query: AnalyticsQueryDto) {
    const result = await this.statService.getAdminDashboardAnalytics(query);
    return {
      message: 'Admin analytics retrieved successfully',
      data: result,
    };
  }
}
