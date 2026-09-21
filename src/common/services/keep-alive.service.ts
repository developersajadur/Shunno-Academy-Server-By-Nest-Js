import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeepAliveService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('KeepAliveService');
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private initialTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.initKeepAlive();
  }

  onApplicationShutdown() {
    this.stopKeepAlive();
  }

  initKeepAlive() {
    const hostOn = (this.configService.get<string>('hostOn') || '').toLowerCase().trim();
    const isRender =
      hostOn === 'render' ||
      hostOn === 'true' ||
      process.env.RENDER === 'true' ||
      Boolean(process.env.RENDER_EXTERNAL_URL);

    if (!isRender) {
      this.logger.log('⏸️ Render Keep-Alive job skipped (HOST_ON is not set to "render")');
      return;
    }

    const port = this.configService.get<number>('port') || 5000;
    const rawServerUrl =
      this.configService.get<string>('serverUrl') ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${port}`;

    const serverBaseUrl = rawServerUrl.replace(/\/$/, '');
    const healthUrl = `${serverBaseUrl}/api/v1/health`;
    const intervalMs = 10 * 60 * 1000; // 10 minutes

    this.logger.log(`🛡️ [Render Keep-Alive] Cron active. Target: ${healthUrl} (Interval: every 10 minutes)`);

    const pingServer = async () => {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Shunno-Academy-NestJS-KeepAlive/1.0',
            'Cache-Control': 'no-cache',
          },
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (response.ok) {
          this.logger.log(
            `🏓 [Render Keep-Alive] Self-ping successful (${healthUrl}) - Status: ${response.status} OK | Latency: ${latency}ms`,
          );
        } else {
          this.logger.warn(
            `⚠️ [Render Keep-Alive] Self-ping status ${response.status} for ${healthUrl} | Latency: ${latency}ms`,
          );
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        this.logger.warn(
          `⚠️ [Render Keep-Alive] Ping attempt to ${healthUrl} failed (${latency}ms): ${err.message}`,
        );
      }
    };

    this.initialTimer = setTimeout(pingServer, 10000);
    if (this.initialTimer.unref) {
      this.initialTimer.unref();
    }

    this.keepAliveTimer = setInterval(pingServer, intervalMs);
    if (this.keepAliveTimer.unref) {
      this.keepAliveTimer.unref();
    }
  }

  stopKeepAlive() {
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
