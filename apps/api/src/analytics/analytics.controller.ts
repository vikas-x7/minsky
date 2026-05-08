import { Controller, Get, Param, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('events/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getEventAnalytics(@Param('id') id: string) {
    const analytics = await this.analyticsService.getEventAnalytics(id);
    return {
      success: true,
      data: analytics,
    };
  }

  @Get('summary')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getSystemSummary() {
    const summary = await this.analyticsService.getSystemSummary();
    return {
      success: true,
      data: summary,
    };
  }
}
