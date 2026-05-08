import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PricingService } from './pricing/pricing.service';
import { CacheService } from './cache/cache.service';

describe('E2E: API Endpoints', () => {
  let app: INestApplication;
  let mockDb: any;

  function createMockDb() {
    const mockQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'mock-event' }]),
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    };

    return {
      select: vi.fn().mockReturnValue(mockQueryBuilder),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
      set: vi.fn(),
    };
  }

  beforeAll(async () => {
    mockDb = createMockDb();
    const mockPricingService = {
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db: mockDb })
      .overrideProvider(PricingService)
      .useValue(mockPricingService)
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .overrideProvider(CacheService)
      .useValue({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        errorHttpStatusCode: 422,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/events', () => {
    it('returns event list with success wrapper', async () => {
      const now = new Date();
      const mockEvents = [
        {
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
        },
      ];

      mockDb.select.mockImplementation((sel?: any) => {
        if (sel) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return { from: vi.fn().mockResolvedValue(mockEvents) };
      });

      const res = await request(app.getHttpServer()).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].name).toBe('Test Event');
      expect(res.body.count).toBe(1);
    });

    it('returns empty data array when no events', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app.getHttpServer()).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });
  });

  describe('GET /api/events/:id', () => {
    it('returns a single event in data field', async () => {
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

      const res = await request(app.getHttpServer()).get('/api/events/event-1');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Event');
    });

    it('returns 404 for nonexistent event', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app.getHttpServer()).get(
        '/api/events/nonexistent',
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/events', () => {
    it('creates an event with valid API key', async () => {
      const now = new Date();
      const mockInserted = {
        id: 'new-event-1',
        name: 'New Event',
        description: null,
        date: new Date('2026-12-31T23:59:59Z'),
        venue: 'Venue',
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

      const res = await request(app.getHttpServer())
        .post('/api/events')
        .set('x-api-key', 'admin-secret-key')
        .send({
          name: 'New Event',
          date: '2026-12-31T23:59:59Z',
          venue: 'Venue',
          totalTickets: 100,
          basePrice: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Event');
    });

    it('returns 401 when API key is missing', async () => {
      const res = await request(app.getHttpServer()).post('/api/events').send({
        name: 'New Event',
        date: '2026-12-31T23:59:59Z',
        venue: 'Venue',
        totalTickets: 100,
        basePrice: 1000,
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/bookings', () => {
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

      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          eventId: 'event-123',
          userEmail: 'user@test.com',
          quantity: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('booking-1');
    });

    it('returns 422 for invalid booking data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          eventId: 'not-a-uuid',
          userEmail: 'not-an-email',
          quantity: 0,
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/bookings', () => {
    it('returns bookings by eventId in data field', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'booking-1',
                eventId: 'event-123',
                userEmail: 'user@test.com',
                quantity: 2,
                pricePerTicket: '1000.00',
                totalPrice: '2000.00',
                createdAt: new Date(),
                eventName: 'Test Event',
              },
            ]),
          }),
        }),
      });

      const res = await request(app.getHttpServer()).get(
        '/api/bookings?eventId=event-123',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].id).toBe('booking-1');
    });

    it('returns validation error without query params', async () => {
      const res = await request(app.getHttpServer()).get('/api/bookings');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics/events/:id', () => {
    it('returns event analytics in data field', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            {
              id: 'event-1',
              name: 'Test Event',
              totalTickets: 100,
              bookedTickets: 30,
              basePrice: '1000.00',
              currentPrice: '1200.00',
              date: new Date(),
              venue: 'Venue',
              description: null,
              priceFloor: '500.00',
              priceCeiling: '5000.00',
              pricingRules: { rules: [] },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            {
              totalBookings: 5,
              totalTicketsSold: 30,
              totalRevenue: 36000,
              averagePrice: 1200,
            },
          ]),
        }),
      });

      const res = await request(app.getHttpServer()).get(
        '/api/analytics/events/event-1',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.eventName).toBe('Test Event');
    });
  });
});
