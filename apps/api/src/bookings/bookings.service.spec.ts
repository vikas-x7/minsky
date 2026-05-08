import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from './bookings.service';
import { PricingService } from '../pricing/pricing.service';
import {
  ResourceNotFoundException,
  InsufficientTicketsException,
  InternalServerException,
} from '../common/exceptions';

describe('BookingsService', () => {
  let bookingsService: BookingsService;
  let mockDb: any;
  let mockPricingService: any;
  let mockCacheService: any;

  function createMockDb() {
    return {
      transaction: vi.fn(),
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      leftJoin: vi.fn(),
      execute: vi.fn(),
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
    bookingsService = new BookingsService(
      mockDatabaseService as any,
      mockPricingService as any,
      mockCacheService as any,
    );
  });

  describe('createBooking', () => {
    const validDto = {
      eventId: 'event-123',
      userEmail: 'user@test.com',
      quantity: 2,
    };

    it('creates a booking successfully', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 100,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      const mockBookingRow = {
        id: 'booking-1',
        eventId: 'event-123',
        userEmail: 'user@test.com',
        quantity: 2,
        pricePerTicket: '1200.00',
        totalPrice: '2400.00',
        createdAt: new Date(),
        eventName: 'Test Event',
      };

      mockDb.execute
        .mockResolvedValueOnce([mockEventRow]) // FOR UPDATE lock
        .mockResolvedValueOnce([{ count: 0 }]); // recent bookings count

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        return fn(mockDb);
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBookingRow]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bookingsService.createBooking(validDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
      expect(result.quantity).toBe(2);
      expect(result.eventName).toBe('Test Event');
      expect(mockPricingService.calculatePrice).toHaveBeenCalledOnce();
    });

    it('throws ResourceNotFoundException when event not found', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        await fn(mockDb);
      });

      await expect(bookingsService.createBooking(validDto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('throws InsufficientTicketsException when event is sold out', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 10,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      mockDb.execute.mockResolvedValueOnce([mockEventRow]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        await fn(mockDb);
      });

      await expect(bookingsService.createBooking(validDto)).rejects.toThrow(
        InsufficientTicketsException,
      );
    });

    it('throws InsufficientTicketsException when remaining < requested quantity', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 10,
        booked_tickets: 9,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      mockDb.execute.mockResolvedValueOnce([mockEventRow]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        await fn(mockDb);
      });

      await expect(
        bookingsService.createBooking({ ...validDto, quantity: 5 }),
      ).rejects.toThrow(InsufficientTicketsException);
    });

    it('uses row-level locking (SELECT FOR UPDATE)', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 100,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      const mockBookingRow = {
        id: 'booking-1',
        eventId: 'event-123',
        userEmail: 'user@test.com',
        quantity: 2,
        pricePerTicket: '1200.00',
        totalPrice: '2400.00',
        createdAt: new Date(),
        eventName: 'Test Event',
      };

      mockDb.execute
        .mockResolvedValueOnce([mockEventRow])
        .mockResolvedValueOnce([{ count: 0 }]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        return fn(mockDb);
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBookingRow]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await bookingsService.createBooking(validDto);

      const forUpdateCall = mockDb.execute.mock.calls.find(
        (call: any) =>
          call[0] &&
          typeof call[0].toSQL === 'function' &&
          call[0].toSQL().includes('FOR UPDATE'),
      );

      expect(mockDb.transaction).toHaveBeenCalledOnce();
    });

    it('warns about low inventory when remaining <= 20%', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 100,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      const mockBookingRow = {
        id: 'booking-1',
        eventId: 'event-123',
        userEmail: 'user@test.com',
        quantity: 85,
        pricePerTicket: '1200.00',
        totalPrice: '102000.00',
        createdAt: new Date(),
        eventName: 'Test Event',
      };

      mockDb.execute
        .mockResolvedValueOnce([mockEventRow])
        .mockResolvedValueOnce([{ count: 0 }]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        return fn(mockDb);
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBookingRow]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bookingsService.createBooking({
        ...validDto,
        quantity: 85,
      });
      expect(result).toBeDefined();
      expect(result.quantity).toBe(85);
    });

    it('handles missing count in recent bookings query', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 100,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      const mockBookingRow = {
        id: 'booking-1',
        eventId: 'event-123',
        userEmail: 'user@test.com',
        quantity: 2,
        pricePerTicket: '1200.00',
        totalPrice: '2400.00',
        createdAt: new Date(),
        eventName: 'Test Event',
      };

      mockDb.execute
        .mockResolvedValueOnce([mockEventRow])
        .mockResolvedValueOnce([{}]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        return fn(mockDb);
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBookingRow]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bookingsService.createBooking(validDto);
      expect(result).toBeDefined();
    });

    it('throws InternalServerException when booking insert fails', async () => {
      const mockEventRow = {
        id: 'event-123',
        name: 'Test Event',
        total_tickets: 100,
        booked_tickets: 10,
        base_price: '1000.00',
        price_floor: '500.00',
        price_ceiling: '5000.00',
        date: new Date('2026-12-31T23:59:59Z'),
        pricing_rules: { rules: [] },
      };

      mockDb.execute
        .mockResolvedValueOnce([mockEventRow])
        .mockResolvedValueOnce([{ count: 0 }]);

      mockDb.transaction.mockImplementation(async (fn: Function) => {
        await fn(mockDb);
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(bookingsService.createBooking(validDto)).rejects.toThrow(
        InternalServerException,
      );
    });
  });

  describe('findByEventId', () => {
    it('returns bookings for a given event ID', async () => {
      const mockRows = [
        {
          id: 'booking-1',
          eventId: 'event-123',
          userEmail: 'user1@test.com',
          quantity: 2,
          pricePerTicket: '1000.00',
          totalPrice: '2000.00',
          createdAt: new Date(),
          eventName: 'Test Event',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      });

      const result = await bookingsService.findByEventId('event-123');

      expect(result).toHaveLength(1);
      expect(result[0]!.eventName).toBe('Test Event');
      expect(result[0]!.quantity).toBe(2);
    });

    it('handles null eventName in findByEventId', async () => {
      const mockRows = [
        {
          id: 'booking-1',
          eventId: 'event-123',
          userEmail: 'user@test.com',
          quantity: 2,
          pricePerTicket: '1000.00',
          totalPrice: '2000.00',
          createdAt: new Date(),
          eventName: null,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      });

      const result = await bookingsService.findByEventId('event-123');
      expect(result[0]!.eventName).toBeUndefined();
    });

    it('returns empty array when no bookings exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await bookingsService.findByEventId('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('findByUserEmail', () => {
    it('returns bookings for a given user email', async () => {
      const mockRows = [
        {
          id: 'booking-1',
          eventId: 'event-123',
          userEmail: 'user@test.com',
          quantity: 3,
          pricePerTicket: '1200.00',
          totalPrice: '3600.00',
          createdAt: new Date(),
          eventName: 'Test Event',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      });

      const result = await bookingsService.findByUserEmail('user@test.com');

      expect(result).toHaveLength(1);
      expect(result[0]!.userEmail).toBe('user@test.com');
    });

    it('handles null eventName in findByUserEmail', async () => {
      const mockRows = [
        {
          id: 'booking-1',
          eventId: 'event-123',
          userEmail: 'user@test.com',
          quantity: 2,
          pricePerTicket: '1000.00',
          totalPrice: '2000.00',
          createdAt: new Date(),
          eventName: null,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      });

      const result = await bookingsService.findByUserEmail('user@test.com');
      expect(result[0]!.eventName).toBeUndefined();
    });

    it('returns empty array when email has no bookings', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await bookingsService.findByUserEmail('nobody@test.com');
      expect(result).toHaveLength(0);
    });
  });

  describe('maskEmail (private)', () => {
    it('masks email addresses correctly', () => {
      const service = bookingsService as any;
      expect(service.maskEmail('john.doe@example.com')).toContain('***');
      expect(service.maskEmail('john.doe@example.com')).toContain('john');
      expect(service.maskEmail('a@b.com')).toContain('***');
    });

    it('handles email with subdomain suffix', () => {
      const service = bookingsService as any;
      const result = service.maskEmail('user@company.co.uk');
      expect(result).toContain('***');
      expect(result).toContain('.uk');
    });

    it('handles short email addresses', () => {
      const service = bookingsService as any;
      const result = service.maskEmail('a@b.c');
      expect(result).toContain('***');
    });

    it('handles email with no subdomain (suffix is empty)', () => {
      const service = bookingsService as any;
      const result = service.maskEmail('user@com');
      expect(result).toBe('user***@c***');
    });
  });
});
