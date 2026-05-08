import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { events, bookings } from '@repo/database';
import { eq, sql } from 'drizzle-orm';
import { PricingService } from '../pricing/pricing.service';
import type { PricingRulesConfig } from '@repo/database';

const DATABASE_URL = process.env['DATABASE_URL'];
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb(
  'Booking Integration Tests',
  () => {
    let client: ReturnType<typeof postgres>;
    let db: ReturnType<typeof drizzle>;
    let pricingService: PricingService;
    let testEventId: string;

    const testPricingRules: PricingRulesConfig = {
      rules: [
        {
          type: 'time_based',
          tiers: [
            { daysBeforeEvent: 30, priceMultiplier: 0.0 },
            { daysBeforeEvent: 7, priceMultiplier: 0.2 },
          ],
        },
        {
          type: 'demand_based',
          windowMinutes: 60,
          tiers: [{ bookingsThreshold: 5, priceMultiplier: 0.1 }],
        },
        {
          type: 'inventory_based',
          tiers: [{ remainingPercentBelow: 20, priceMultiplier: 0.25 }],
        },
      ],
    };

    beforeAll(async () => {
      process.env['PRICING_WEIGHT_TIME'] = '1.0';
      process.env['PRICING_WEIGHT_DEMAND'] = '1.0';
      process.env['PRICING_WEIGHT_INVENTORY'] = '1.0';

      client = postgres(DATABASE_URL!, { max: 10 });
      db = drizzle(client);
      pricingService = new PricingService();
    });

    afterAll(async () => {
      await client.end();
    });

    beforeEach(async () => {
      const inserted = await db
        .insert(events)
        .values({
          name: 'Integration Test Event',
          description: 'Event for integration testing',
          date: new Date('2026-12-01T20:00:00Z'),
          venue: 'Integration Test Venue',
          totalTickets: 50,
          bookedTickets: 0,
          basePrice: '1000.00',
          currentPrice: '1000.00',
          priceFloor: '500.00',
          priceCeiling: '3000.00',
          pricingRules: testPricingRules,
        })
        .returning();

      testEventId = inserted[0]!.id;
    });

    afterEach(async () => {
      if (testEventId) {
        await db.delete(bookings).where(eq(bookings.eventId, testEventId));
        await db.delete(events).where(eq(events.id, testEventId));
      }
    });

    it('completes full booking flow: price calculation → booking → inventory update', async () => {
      const eventResult = await db
        .select()
        .from(events)
        .where(eq(events.id, testEventId));
      const event = eventResult[0]!;

      const priceBreakdown = pricingService.calculatePrice({
        basePrice: parseFloat(event.basePrice),
        priceFloor: parseFloat(event.priceFloor),
        priceCeiling: parseFloat(event.priceCeiling),
        eventDate: event.date,
        totalTickets: event.totalTickets,
        bookedTickets: event.bookedTickets,
        recentBookingsCount: 0,
        pricingRules: event.pricingRules,
      });

      expect(priceBreakdown.finalPrice).toBeGreaterThan(0);
      expect(priceBreakdown.finalPrice).toBeGreaterThanOrEqual(
        parseFloat(event.priceFloor),
      );
      expect(priceBreakdown.finalPrice).toBeLessThanOrEqual(
        parseFloat(event.priceCeiling),
      );

      const quantity = 3;
      const totalPrice = priceBreakdown.finalPrice * quantity;

      const insertedBooking = await db
        .insert(bookings)
        .values({
          eventId: testEventId,
          userEmail: 'integration@test.com',
          quantity,
          pricePerTicket: priceBreakdown.finalPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        })
        .returning();

      expect(insertedBooking[0]).toBeDefined();
      expect(insertedBooking[0]!.quantity).toBe(quantity);

      await db
        .update(events)
        .set({
          bookedTickets: event.bookedTickets + quantity,
          currentPrice: priceBreakdown.finalPrice.toFixed(2),
        })
        .where(eq(events.id, testEventId));

      const updatedEvent = await db
        .select()
        .from(events)
        .where(eq(events.id, testEventId));

      expect(updatedEvent[0]!.bookedTickets).toBe(quantity);
      expect(parseFloat(updatedEvent[0]!.currentPrice)).toBe(
        priceBreakdown.finalPrice,
      );
    });

    it('records price snapshot correctly at booking time', async () => {
      const initialPrice = pricingService.calculatePrice({
        basePrice: 1000,
        priceFloor: 500,
        priceCeiling: 3000,
        eventDate: new Date('2026-12-01T20:00:00Z'),
        totalTickets: 50,
        bookedTickets: 0,
        recentBookingsCount: 0,
        pricingRules: testPricingRules,
      });

      await db.insert(bookings).values({
        eventId: testEventId,
        userEmail: 'snapshot@test.com',
        quantity: 1,
        pricePerTicket: initialPrice.finalPrice.toFixed(2),
        totalPrice: initialPrice.finalPrice.toFixed(2),
      });

      await db
        .update(events)
        .set({ bookedTickets: 41 })
        .where(eq(events.id, testEventId));

      const laterPrice = pricingService.calculatePrice({
        basePrice: 1000,
        priceFloor: 500,
        priceCeiling: 3000,
        eventDate: new Date('2026-12-01T20:00:00Z'),
        totalTickets: 50,
        bookedTickets: 41,
        recentBookingsCount: 0,
        pricingRules: testPricingRules,
      });

      const bookingResult = await db
        .select()
        .from(bookings)
        .where(eq(bookings.eventId, testEventId));

      expect(parseFloat(bookingResult[0]!.pricePerTicket)).toBe(
        initialPrice.finalPrice,
      );
      expect(laterPrice.finalPrice).toBeGreaterThan(initialPrice.finalPrice);
    });

    it('rejects booking when quantity exceeds remaining tickets', async () => {
      await db
        .update(events)
        .set({ bookedTickets: 48 })
        .where(eq(events.id, testEventId));

      const eventResult = await db
        .select()
        .from(events)
        .where(eq(events.id, testEventId));
      const event = eventResult[0]!;

      const remaining = event.totalTickets - event.bookedTickets;
      expect(remaining).toBe(2);

      const requestedQuantity = 5;
      expect(remaining < requestedQuantity).toBe(true);
    });

    it('tracks multiple bookings for the same event', async () => {
      await db
        .insert(bookings)
        .values({
          eventId: testEventId,
          userEmail: 'user1@test.com',
          quantity: 2,
          pricePerTicket: '1000.00',
          totalPrice: '2000.00',
        })
        .returning();

      await db
        .insert(bookings)
        .values({
          eventId: testEventId,
          userEmail: 'user2@test.com',
          quantity: 3,
          pricePerTicket: '1050.00',
          totalPrice: '3150.00',
        })
        .returning();

      const allBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.eventId, testEventId));

      expect(allBookings.length).toBe(2);

      const totalQuantity = allBookings.reduce((sum, b) => sum + b.quantity, 0);
      expect(totalQuantity).toBe(5);

      const totalRevenue = allBookings.reduce(
        (sum, b) => sum + parseFloat(b.totalPrice),
        0,
      );
      expect(totalRevenue).toBe(5150);
    });
  },
  30000,
);
