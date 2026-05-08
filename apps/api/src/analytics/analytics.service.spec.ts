import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { ResourceNotFoundException } from '../common/exceptions';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockDb: any;
  let mockCacheService: any;

  function createMockDb() {
    return {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
    };
  }

  function createMockCacheService() {
    return {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    mockDb = createMockDb();
    mockCacheService = createMockCacheService();
    const mockDatabaseService = { db: mockDb };
    analyticsService = new AnalyticsService(
      mockDatabaseService as any,
      mockCacheService as any,
    );
  });

  describe('getEventAnalytics', () => {
    it('returns analytics for a valid event', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        totalTickets: 100,
        bookedTickets: 30,
        basePrice: '1000.00',
        currentPrice: '1200.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBookingStats = [
        {
          totalBookings: 5,
          totalTicketsSold: 30,
          totalRevenue: 36000,
          averagePrice: 1200,
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockEvent]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockBookingStats),
        }),
      });

      const result = await analyticsService.getEventAnalytics('event-1');

      expect(result).toBeDefined();
      expect(result.eventName).toBe('Test Event');
      expect(result.totalTickets).toBe(100);
      expect(result.ticketsSold).toBe(30);
      expect(result.ticketsRemaining).toBe(70);
      expect(result.percentSold).toBe(30);
      expect(result.totalRevenue).toBe(36000);
      expect(result.averagePrice).toBe(1200);
      expect(result.totalBookings).toBe(5);
    });

    it('returns 0 stats when no bookings exist', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        totalTickets: 100,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockEvent]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            {
              totalBookings: 0,
              totalTicketsSold: 0,
              totalRevenue: 0,
              averagePrice: 0,
            },
          ]),
        }),
      });

      const result = await analyticsService.getEventAnalytics('event-1');

      expect(result.ticketsSold).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averagePrice).toBe(0);
      expect(result.totalBookings).toBe(0);
    });

    it('throws ResourceNotFoundException for nonexistent event', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await expect(
        analyticsService.getEventAnalytics('nonexistent'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('handles event with 0 totalTickets (percentSold = 0)', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Zero Ticket Event',
        totalTickets: 0,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockEvent]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            {
              totalBookings: 0,
              totalTicketsSold: 0,
              totalRevenue: 0,
              averagePrice: 0,
            },
          ]),
        }),
      });

      const result = await analyticsService.getEventAnalytics('event-1');
      expect(result.percentSold).toBe(0);
      expect(result.ticketsRemaining).toBe(0);
    });

    it('uses default values when booking stats array is empty', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        totalTickets: 100,
        bookedTickets: 30,
        basePrice: '1000.00',
        currentPrice: '1200.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockEvent]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await analyticsService.getEventAnalytics('event-1');
      expect(result.totalRevenue).toBe(0);
      expect(result.averagePrice).toBe(0);
      expect(result.totalBookings).toBe(0);
    });

    it('calculates percentSold correctly', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        totalTickets: 200,
        bookedTickets: 75,
        basePrice: '1000.00',
        currentPrice: '1200.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockEvent]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            {
              totalBookings: 10,
              totalTicketsSold: 75,
              totalRevenue: 90000,
              averagePrice: 1200,
            },
          ]),
        }),
      });

      const result = await analyticsService.getEventAnalytics('event-1');

      expect(result.percentSold).toBe(37.5);
    });
  });

  describe('getSystemSummary', () => {
    it('returns system-wide metrics', async () => {
      const mockEventStats = [
        {
          totalEvents: 5,
          totalTicketsSold: 200,
          soldOutEvents: 1,
          upcomingEvents: 3,
        },
      ];

      const mockBookingStats = [
        {
          totalBookings: 50,
          totalRevenue: 250000,
          averagePrice: 1250,
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce(mockEventStats),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce(mockBookingStats),
      });

      const result = await analyticsService.getSystemSummary();

      expect(result).toBeDefined();
      expect(result.totalEvents).toBe(5);
      expect(result.totalTicketsSold).toBe(200);
      expect(result.totalRevenue).toBe(250000);
      expect(result.averageTicketPrice).toBe(1250);
      expect(result.totalBookings).toBe(50);
      expect(result.soldOutEvents).toBe(1);
      expect(result.upcomingEvents).toBe(3);
    });

    it('returns zeros when no data exists', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce([
          {
            totalEvents: 0,
            totalTicketsSold: 0,
            soldOutEvents: 0,
            upcomingEvents: 0,
          },
        ]),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce([
          {
            totalBookings: 0,
            totalRevenue: 0,
            averagePrice: 0,
          },
        ]),
      });

      const result = await analyticsService.getSystemSummary();

      expect(result.totalEvents).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.totalBookings).toBe(0);
    });

    it('handles empty event stats and booking stats arrays', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce([]),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValueOnce([]),
      });

      const result = await analyticsService.getSystemSummary();

      expect(result.totalEvents).toBe(0);
      expect(result.totalTicketsSold).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageTicketPrice).toBe(0);
      expect(result.totalBookings).toBe(0);
      expect(result.soldOutEvents).toBe(0);
      expect(result.upcomingEvents).toBe(0);
    });
  });
});
