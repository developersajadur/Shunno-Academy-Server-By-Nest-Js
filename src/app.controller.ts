import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { BypassTransform } from './common/decorators/bypass-transform.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @BypassTransform()
  @Get()
  @ApiOperation({ summary: 'API Root' })
  getRoot() {
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    return {
      success: true,
      message: '🚀 Shunno Academy REST API is running smoothly.',
      ...(isProd ? {} : { documentation: '/api/docs' }),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @BypassTransform()
  @Get('health')
  @ApiOperation({ summary: 'Health Check' })
  getHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('nodeEnv'),
    };
  }
}
