import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockAnalyticsService: any;

  beforeEach(() => {
    mockAnalyticsService = {
      getEventAnalytics: vi.fn(),
      getSystemSummary: vi.fn(),
    };
    controller = new AnalyticsController(mockAnalyticsService);
  });

  describe('GET /analytics/events/:id', () => {
    it('returns event analytics', async () => {
      const mockAnalytics = {
        eventId: 'event-1',
        eventName: 'Test Event',
        totalTickets: 100,
        ticketsSold: 30,
        totalRevenue: 36000,
      };
      mockAnalyticsService.getEventAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getEventAnalytics('event-1');

      expect(result).toEqual({
        success: true,
        data: mockAnalytics,
      });
      expect(mockAnalyticsService.getEventAnalytics).toHaveBeenCalledWith(
        'event-1',
      );
    });
  });

  describe('GET /analytics/summary', () => {
    it('returns system summary', async () => {
      const mockSummary = {
        totalEvents: 5,
        totalTicketsSold: 200,
        totalRevenue: 250000,
      };
      mockAnalyticsService.getSystemSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSystemSummary();

      expect(result).toEqual({
        success: true,
        data: mockSummary,
      });
      expect(mockAnalyticsService.getSystemSummary).toHaveBeenCalledOnce();
    });
  });
});
