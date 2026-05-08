import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsService } from './events.service';
import { PricingService } from '../pricing/pricing.service';
import {
  ResourceNotFoundException,
  InternalServerException,
} from '../common/exceptions';

describe('EventsService', () => {
  let eventsService: EventsService;
  let mockDb: any;
  let mockPricingService: any;
  let mockCacheService: any;

  function createMockDb() {
    return {
      select: vi.fn(),
      insert: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
    };
  }

  function createMockPricingService() {
    return {
      calculatePrice: vi.fn().mockReturnValue({
        basePrice: 1000,
        finalPrice: 1200,
        adjustments: [],
        totalMultiplier: 0.2,
        rawCalculatedPrice: 1200,
        priceFloor: 500,
        priceCeiling: 5000,
        wasCapped: false,
      }),
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
    mockPricingService = createMockPricingService();
    mockCacheService = createMockCacheService();
    const mockDatabaseService = { db: mockDb };
    eventsService = new EventsService(
      mockDatabaseService as any,
      mockPricingService as any,
      mockCacheService as any,
    );
  });

  describe('findAll', () => {
    it('returns all events with pricing', async () => {
      const now = new Date();
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Test Event 1',
          description: 'Description 1',
          date: new Date('2026-12-31T23:59:59Z'),
          venue: 'Venue 1',
          totalTickets: 100,
          bookedTickets: 20,
          basePrice: '1000.00',
          currentPrice: '1000.00',
          priceFloor: '500.00',
          priceCeiling: '5000.00',
          pricingRules: { rules: [] },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'event-2',
          name: 'Test Event 2',
          description: 'Description 2',
          date: new Date('2026-12-31T23:59:59Z'),
          venue: 'Venue 2',
          totalTickets: 200,
          bookedTickets: 50,
          basePrice: '2000.00',
          currentPrice: '2000.00',
          priceFloor: '1000.00',
          priceCeiling: '10000.00',
          pricingRules: { rules: [] },
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockDb.select.mockImplementation((selection?: any) => {
        if (selection) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue(mockEvents),
        };
      });

      const result = await eventsService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Test Event 1');
      expect(result[1]!.name).toBe('Test Event 2');
      expect(result[0]!.remainingTickets).toBe(80);
      expect(mockPricingService.calculatePrice).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no events exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue([]),
      });

      const result = await eventsService.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('returns a single event with price breakdown', async () => {
      const now = new Date();
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        description: 'Description',
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        totalTickets: 100,
        bookedTickets: 20,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        createdAt: now,
        updatedAt: now,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEvent]),
        }),
      });

      const result = await eventsService.findOne('event-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Event');
      expect(result.id).toBe('event-1');
      expect(result.remainingTickets).toBe(80);
      expect(result.currentPrice).toBe(1200);
    });

    it('throws ResourceNotFoundException when event not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(eventsService.findOne('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an event successfully', async () => {
      const now = new Date();
      const createDto = {
        name: 'New Event',
        description: 'New Description',
        date: '2026-12-31T23:59:59Z',
        venue: 'New Venue',
        totalTickets: 100,
        basePrice: 1000,
      };

      const mockInserted = {
        id: 'new-event-1',
        name: 'New Event',
        description: 'New Description',
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'New Venue',
        totalTickets: 100,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        createdAt: now,
        updatedAt: now,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInserted]),
        }),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInserted]),
        }),
      });

      const result = await eventsService.create(createDto as any);

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it('uses default pricing rules when none provided', async () => {
      const now = new Date();
      const createDto = {
        name: 'New Event',
        description: 'New Description',
        date: '2026-12-31T23:59:59Z',
        venue: 'New Venue',
        totalTickets: 100,
        basePrice: 1000,
      };

      const mockInserted = {
        id: 'new-event-1',
        name: 'New Event',
        description: 'New Description',
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'New Venue',
        totalTickets: 100,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '5000.00',
        pricingRules: { rules: [] },
        createdAt: now,
        updatedAt: now,
      };

      let capturedValues: any;
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals;
          return { returning: vi.fn().mockResolvedValue([mockInserted]) };
        }),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInserted]),
        }),
      });

      await eventsService.create(createDto as any);

      expect(capturedValues.pricingRules).toBeDefined();
      expect(capturedValues.pricingRules.rules).toHaveLength(3);
    });

    it('calculates default floor and ceiling when not provided', async () => {
      const createDto = {
        name: 'New Event',
        date: '2026-12-31T23:59:59Z',
        venue: 'Venue',
        totalTickets: 100,
        basePrice: 1000,
      };

      const mockInserted = {
        id: 'new-event-1',
        name: 'New Event',
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        totalTickets: 100,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '500.00',
        priceCeiling: '2000.00',
        pricingRules: { rules: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let capturedValues: any;
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals;
          return { returning: vi.fn().mockResolvedValue([mockInserted]) };
        }),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInserted]),
        }),
      });

      await eventsService.create(createDto as any);

      expect(capturedValues.priceFloor).toBe('500.00');
      expect(capturedValues.priceCeiling).toBe('2000.00');
    });

    it('uses custom floor and ceiling when provided', async () => {
      const createDto = {
        name: 'New Event',
        date: '2026-12-31T23:59:59Z',
        venue: 'Venue',
        totalTickets: 100,
        basePrice: 1000,
        priceFloor: 800,
        priceCeiling: 3000,
      };

      const mockInserted = {
        id: 'new-event-1',
        name: 'New Event',
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
        totalTickets: 100,
        bookedTickets: 0,
        basePrice: '1000.00',
        currentPrice: '1000.00',
        priceFloor: '800.00',
        priceCeiling: '3000.00',
        pricingRules: { rules: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let capturedValues: any;
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals;
          return { returning: vi.fn().mockResolvedValue([mockInserted]) };
        }),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInserted]),
        }),
      });

      await eventsService.create(createDto as any);

      expect(capturedValues.priceFloor).toBe('800.00');
      expect(capturedValues.priceCeiling).toBe('3000.00');
    });

    it('throws InternalServerException when insert returns empty', async () => {
      const createDto = {
        name: 'New Event',
        date: '2026-12-31T23:59:59Z',
        venue: 'Venue',
        totalTickets: 100,
        basePrice: 1000,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(eventsService.create(createDto as any)).rejects.toThrow(
        InternalServerException,
      );
    });
  });

  describe('getRecentBookingsCount', () => {
    it('returns count of recent bookings', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await (eventsService as any).getRecentBookingsCount(
        'event-1',
        60,
      );

      expect(result).toBe(5);
    });

    it('returns 0 when no recent bookings', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const result = await (eventsService as any).getRecentBookingsCount(
        'event-1',
        60,
      );

      expect(result).toBe(0);
    });
  });
});
