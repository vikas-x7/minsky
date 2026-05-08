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
import type { PricingRulesConfig } from '@repo/database';

const DATABASE_URL = process.env['DATABASE_URL'];
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb(
  'Concurrent Bookings',
  () => {
    let client: ReturnType<typeof postgres>;
    let db: ReturnType<typeof drizzle>;
    let testEventId: string;

    const testPricingRules: PricingRulesConfig = {
      rules: [
        {
          type: 'time_based',
          tiers: [{ daysBeforeEvent: 30, priceMultiplier: 0.0 }],
        },
        {
          type: 'demand_based',
          windowMinutes: 60,
          tiers: [{ bookingsThreshold: 100, priceMultiplier: 0.1 }],
        },
        {
          type: 'inventory_based',
          tiers: [{ remainingPercentBelow: 0, priceMultiplier: 0.0 }],
        },
      ],
    };

    beforeAll(async () => {
      client = postgres(DATABASE_URL!, { max: 10 });
      db = drizzle(client);
    });

    afterAll(async () => {
      await client.end();
    });

    afterEach(async () => {
      if (testEventId) {
        await db.delete(bookings).where(eq(bookings.eventId, testEventId));
        await db.delete(events).where(eq(events.id, testEventId));
      }
    });

    /**
     * Generic booking attempt function.
     * Each call creates its own postgres connection (max: 1) to simulate
     * a truly independent concurrent client.
     */
    async function attemptBooking(
      eventId: string,
      userEmail: string,
      quantity: number,
    ): Promise<{ success: boolean; error?: string }> {
      const bookingClient = postgres(DATABASE_URL!, { max: 1 });
      try {
        const result = await bookingClient.begin(async (tx) => {
          // Step 1: Lock the event row
          const lockedRows = await tx`
            SELECT * FROM events WHERE id = ${eventId} FOR UPDATE
          `;
          const eventRow = lockedRows[0];
          if (!eventRow) {
            throw new Error('Event not found');
          }

          const totalTickets = eventRow['total_tickets'] as number;
          const bookedTickets = eventRow['booked_tickets'] as number;
          const remaining = totalTickets - bookedTickets;

          // Step 2: Check capacity
          if (remaining < quantity) {
            throw new Error(
              `Not enough tickets available. Remaining: ${remaining}, Requested: ${quantity}`,
            );
          }

          // Step 3: Insert booking
          await tx`
            INSERT INTO bookings (event_id, user_email, quantity, price_per_ticket, total_price)
            VALUES (${eventId}, ${userEmail}, ${quantity}, '100.00', ${(100 * quantity).toFixed(2)})
          `;

          // Step 4: Update booked_tickets
          await tx`
            UPDATE events
            SET booked_tickets = booked_tickets + ${quantity}, updated_at = NOW()
            WHERE id = ${eventId}
          `;

          return { success: true };
        });

        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      } finally {
        await bookingClient.end();
      }
    }

    // ─── Scenario A: Last ticket race (1 ticket, 2 requests of qty 1) ─────
    describe('Scenario A: Last ticket race', () => {
      beforeEach(async () => {
        const inserted = await db
          .insert(events)
          .values({
            name: 'Concurrency Test - Scenario A',
            description: '1 ticket, 2 simultaneous requests',
            date: new Date('2026-12-31T23:59:59Z'),
            venue: 'Test Venue',
            totalTickets: 1,
            bookedTickets: 0,
            basePrice: '100.00',
            currentPrice: '100.00',
            priceFloor: '50.00',
            priceCeiling: '200.00',
            pricingRules: testPricingRules,
          })
          .returning();

        testEventId = inserted[0]!.id;
      });

      it('prevents overbooking: exactly 1 success, 1 failure', async () => {
        // 2 simultaneous requests, each for 1 ticket
        const [result1, result2] = await Promise.all([
          attemptBooking(testEventId, 'user1@test.com', 1),
          attemptBooking(testEventId, 'user2@test.com', 1),
        ]);

        const successes = [result1, result2].filter((r) => r.success);
        const failures = [result1, result2].filter((r) => !r.success);

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(1);
        expect(failures[0]!.error).toContain('Not enough tickets');

        // Verify database state
        const eventResult = await db
          .select()
          .from(events)
          .where(eq(events.id, testEventId));

        expect(eventResult[0]!.bookedTickets).toBe(1);
        expect(eventResult[0]!.bookedTickets).toBeLessThanOrEqual(
          eventResult[0]!.totalTickets,
        );

        // Verify exactly 1 booking row
        const bookingResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.eventId, testEventId));

        expect(bookingResult[0]!.count).toBe(1);
      });
    });

    // ─── Scenario B: Bulk race (5 tickets, 10 requests of qty 5 each) ────
    describe('Scenario B: Bulk race', () => {
      beforeEach(async () => {
        const inserted = await db
          .insert(events)
          .values({
            name: 'Concurrency Test - Scenario B',
            description: '5 tickets, 10 simultaneous requests of qty 5',
            date: new Date('2026-12-31T23:59:59Z'),
            venue: 'Test Venue',
            totalTickets: 5,
            bookedTickets: 0,
            basePrice: '100.00',
            currentPrice: '100.00',
            priceFloor: '50.00',
            priceCeiling: '200.00',
            pricingRules: testPricingRules,
          })
          .returning();

        testEventId = inserted[0]!.id;
      });

      it('prevents overbooking: exactly 1 success, 9 failures', async () => {
        // 10 simultaneous requests, each for 5 tickets
        const results = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            attemptBooking(testEventId, `bulkuser${i}@test.com`, 5),
          ),
        );

        const successes = results.filter((r) => r.success);
        const failures = results.filter((r) => !r.success);

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(9);

        for (const f of failures) {
          expect(f.error).toContain('Not enough tickets');
        }

        // Verify database state
        const eventResult = await db
          .select()
          .from(events)
          .where(eq(events.id, testEventId));

        expect(eventResult[0]!.bookedTickets).toBe(5);
        expect(eventResult[0]!.bookedTickets).toBeLessThanOrEqual(
          eventResult[0]!.totalTickets,
        );

        // Verify exactly 1 booking row
        const bookingResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.eventId, testEventId));

        expect(bookingResult[0]!.count).toBe(1);
      });
    });

    // ─── Scenario C: Both succeed (2 tickets, 2 requests of qty 1 each) ──
    describe('Scenario C: Both succeed', () => {
      beforeEach(async () => {
        const inserted = await db
          .insert(events)
          .values({
            name: 'Concurrency Test - Scenario C',
            description: '2 tickets, 2 simultaneous requests of qty 1',
            date: new Date('2026-12-31T23:59:59Z'),
            venue: 'Test Venue',
            totalTickets: 2,
            bookedTickets: 0,
            basePrice: '100.00',
            currentPrice: '100.00',
            priceFloor: '50.00',
            priceCeiling: '200.00',
            pricingRules: testPricingRules,
          })
          .returning();

        testEventId = inserted[0]!.id;
      });

      it('allows both bookings: 2 successes, 0 failures', async () => {
        // 2 simultaneous requests, each for 1 ticket (enough for both)
        const [result1, result2] = await Promise.all([
          attemptBooking(testEventId, 'bothwin1@test.com', 1),
          attemptBooking(testEventId, 'bothwin2@test.com', 1),
        ]);

        const successes = [result1, result2].filter((r) => r.success);
        const failures = [result1, result2].filter((r) => !r.success);

        expect(successes.length).toBe(2);
        expect(failures.length).toBe(0);

        // Verify database state
        const eventResult = await db
          .select()
          .from(events)
          .where(eq(events.id, testEventId));

        expect(eventResult[0]!.bookedTickets).toBe(2);
        expect(eventResult[0]!.bookedTickets).toBeLessThanOrEqual(
          eventResult[0]!.totalTickets,
        );

        // Verify exactly 2 booking rows
        const bookingResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.eventId, testEventId));

        expect(bookingResult[0]!.count).toBe(2);
      });
    });
  },
  30000,
);
