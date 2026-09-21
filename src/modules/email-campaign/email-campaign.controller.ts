import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { EmailCampaignService } from './email-campaign.service';
import { BroadcastEmailDto, SendTestEmailDto } from './dto/email-campaign.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Email Campaigns')
@Controller('emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class EmailCampaignController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast custom promotional email to users or course students' })
  async sendBroadcast(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: BroadcastEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.emailCampaignService.sendBroadcast(admin.userId, dto);
    return {
      message: result.message,
      data: result,
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test promotional email to verify layout' })
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const result = await this.emailCampaignService.sendTestEmail(dto);
    return {
      message: result.message,
      data: result,
    };
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Retrieve history of past email campaigns' })
  async getCampaignHistory() {
    const result = await this.emailCampaignService.getCampaignHistory();
    return {
      message: 'Campaign history retrieved successfully',
      data: result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Retrieve email stats and total recipients reached' })
  async getEmailStats() {
    const result = await this.emailCampaignService.getEmailStats();
    return {
      message: 'Email stats retrieved successfully',
      data: result,
    };
  }
}
