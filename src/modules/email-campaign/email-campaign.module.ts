import { Module } from '@nestjs/common';
import { EmailCampaignController } from './email-campaign.controller';
import { EmailCampaignService } from './email-campaign.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmailCampaignController],
  providers: [EmailCampaignService],
  exports: [EmailCampaignService],
})
export class EmailCampaignModule {}
