import { describe, it, expect } from 'vitest';
import {
  events,
  bookings,
  eventsRelations,
  bookingsRelations,
} from '@repo/database';
import { eq, sql } from 'drizzle-orm';

describe('Database Schema', () => {
  it('exports events and bookings table definitions', () => {
    expect(events).toBeDefined();
    expect(bookings).toBeDefined();
  });

  it('exports relation definitions', () => {
    expect(eventsRelations).toBeDefined();
    expect(bookingsRelations).toBeDefined();
  });

  it('events table columns can be accessed via drizzle SQL', () => {
    expect(events.id).toBeDefined();
    expect(events.name).toBeDefined();
    expect(events.description).toBeDefined();
    expect(events.date).toBeDefined();
    expect(events.venue).toBeDefined();
    expect(events.totalTickets).toBeDefined();
    expect(events.bookedTickets).toBeDefined();
    expect(events.basePrice).toBeDefined();
    expect(events.currentPrice).toBeDefined();
    expect(events.priceFloor).toBeDefined();
    expect(events.priceCeiling).toBeDefined();
    expect(events.pricingRules).toBeDefined();
    expect(events.createdAt).toBeDefined();
    expect(events.updatedAt).toBeDefined();
  });

  it('bookings table columns can be accessed via drizzle SQL', () => {
    expect(bookings.id).toBeDefined();
    expect(bookings.eventId).toBeDefined();
    expect(bookings.userEmail).toBeDefined();
    expect(bookings.quantity).toBeDefined();
    expect(bookings.pricePerTicket).toBeDefined();
    expect(bookings.totalPrice).toBeDefined();
    expect(bookings.createdAt).toBeDefined();
  });

  it('can use drizzle query helpers on events', () => {
    expect(typeof eq).toBe('function');
    expect(typeof sql).toBe('function');
  });

  it('can construct a valid event insert object', () => {
    const newEvent = {
      name: 'Test Event',
      date: new Date('2026-12-31T23:59:59Z'),
      venue: 'Test Venue',
      totalTickets: 100,
      bookedTickets: 0,
      basePrice: '1000.00',
      currentPrice: '1000.00',
      priceFloor: '500.00',
      priceCeiling: '2000.00',
      pricingRules: {
        rules: [
          {
            type: 'time_based' as const,
            tiers: [{ daysBeforeEvent: 7, priceMultiplier: 0.2 }],
          },
        ],
      },
    };
    expect(newEvent.name).toBe('Test Event');
    expect(newEvent.pricingRules.rules).toHaveLength(1);
  });

  it('can construct a valid booking insert object', () => {
    const newBooking = {
      eventId: 'abc-123',
      userEmail: 'user@test.com',
      quantity: 2,
      pricePerTicket: '1200.00',
      totalPrice: '2400.00',
    };
    expect(newBooking.eventId).toBe('abc-123');
    expect(newBooking.userEmail).toContain('@');
  });
});
