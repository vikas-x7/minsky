import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export interface TimeBasedRule {
  type: 'time_based';
  tiers: Array<{
    daysBeforeEvent: number;
    priceMultiplier: number;
  }>;
}

export interface DemandBasedRule {
  type: 'demand_based';
  windowMinutes: number;
  tiers: Array<{
    bookingsThreshold: number;
    priceMultiplier: number;
  }>;
}

export interface InventoryBasedRule {
  type: 'inventory_based';
  tiers: Array<{
    remainingPercentBelow: number;
    priceMultiplier: number;
  }>;
}

export type PricingRule = TimeBasedRule | DemandBasedRule | InventoryBasedRule;

export interface PricingRulesConfig {
  rules: PricingRule[];
}

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    date: timestamp('date', { withTimezone: true }).notNull(),
    venue: varchar('venue', { length: 255 }).notNull(),

    totalTickets: integer('total_tickets').notNull(),
    bookedTickets: integer('booked_tickets').notNull().default(0),

    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    currentPrice: decimal('current_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
    priceFloor: decimal('price_floor', { precision: 10, scale: 2 }).notNull(),
    priceCeiling: decimal('price_ceiling', {
      precision: 10,
      scale: 2,
    }).notNull(),

    pricingRules: jsonb('pricing_rules').$type<PricingRulesConfig>().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_events_date').on(table.date)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull(),

    pricePerTicket: decimal('price_per_ticket', {
      precision: 10,
      scale: 2,
    }).notNull(),
    totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_bookings_event_id').on(table.eventId),
    index('idx_bookings_user_email').on(table.userEmail),
    index('idx_bookings_created_at').on(table.createdAt),
  ],
);

export const eventsRelations = relations(events, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
