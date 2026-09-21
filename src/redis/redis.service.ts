import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_TTL } from '../common/constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');
    const tls = this.configService.get<boolean>('redis.tls');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
    } else {
      this.client = new Redis({
        host,
        port,
        password,
        tls: tls ? {} : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
    }

    this.client.on('connect', () => {
      this.logger.log('⚡ Connected to Redis successfully');
    });

    this.client.on('error', (err) => {
      this.logger.warn(`⚠️ Redis client notice: ${err.message}`);
    });

    // Attempt connection
    this.client.connect().catch((err) => {
      this.logger.warn(`⚠️ Redis initial connect failed (will retry): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('💤 Redis client disconnected');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Non-blocking
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Non-blocking
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const unlinkPromises: Promise<any>[] = [];

      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = this.client.pipeline();
          keys.forEach((key) => pipeline.unlink(key));
          unlinkPromises.push(pipeline.exec());
        }
      });

      await new Promise<void>((resolve) => {
        stream.on('end', async () => {
          await Promise.allSettled(unlinkPromises);
          resolve();
        });
        stream.on('error', () => resolve());
      });
    } catch (err: any) {
      this.logger.warn(`Redis delByPattern failed for pattern "${pattern}": ${err.message}`);
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
