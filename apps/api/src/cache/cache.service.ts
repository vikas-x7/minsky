import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;

  constructor() {
    try {
      if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.logger.log('Redis initialized');
      } else {
        this.logger.warn(
          'Redis credentials not provided. Cache will be disabled.',
        );
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get<T>(key);
      if (data !== null) {
        this.logger.debug(`Cache hit - key: ${key}`);
        return data;
      } else {
        this.logger.debug(`Cache miss - key: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache error - ${error}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.logger.error(`Cache error - ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache invalidated - keys: ${key}`);
    } catch (error) {
      this.logger.error(`Cache error - ${error}`);
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!this.redis || keys.length === 0) return;
    try {
      await this.redis.del(...keys);
      this.logger.debug(`Cache invalidated - keys: ${keys.join(', ')}`);
    } catch (error) {
      this.logger.error(`Cache error - ${error}`);
    }
  }
}
