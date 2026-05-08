import { Controller, Post, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(@Inject(SeedService) private readonly seedService: SeedService) {}

  /**
   * POST /api/seed
   * Seed the database with sample events.
   */
  @Post()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  async seed() {
    const result = await this.seedService.seed();
    return {
      success: true,
      data: result,
    };
  }
}
