# DESIGN.md Event Ticketing Platform

## Overview

This document explains the architecture and design decisions made while building the full-stack dynamic pricing event ticketing platform. The assignment required solving two core technical challenges: a deterministic pricing engine and concurrency-safe booking. Everything else was kept intentionally minimal.

---

## 1. Pricing Algorithm Design & Implementation

### Formula

```
currentPrice = basePrice × (1 + Σ(rawMultiplier × weight))
finalPrice   = clamp(rawPrice, priceFloor, priceCeiling)
```

The pricing engine lives in `apps/api/src/pricing/pricing.service.ts` as a pure, stateless NestJS `@Injectable()` service. Given the same inputs it always produces the same output this makes it deterministic and trivially unit-testable. An optional `now?: Date` field in `PricingContext` allows tests to inject a fixed timestamp so time-based calculations are fully reproducible.

```typescript
// PricingContext -everything the engine needs
export interface PricingContext {
  basePrice: number;
  priceFloor: number;
  priceCeiling: number;
  eventDate: Date;
  totalTickets: number;
  bookedTickets: number;
  recentBookingsCount: number;
  pricingRules: PricingRulesConfig;
  now?: Date; // injectable for deterministic testing
}
```

### Three Rules

The engine iterates `pricingRules.rules`, calls `evaluateRule()` for each, and accumulates `RuleAdjustment` objects:

```typescript
for (const rule of context.pricingRules.rules) {
  const adjustment = this.evaluateRule(rule, context, now, weights);
  if (adjustment) adjustments.push(adjustment);
}

const totalMultiplier = adjustments.reduce(
  (sum, adj) => sum + adj.weightedMultiplier,
  0,
);
const rawCalculatedPrice = context.basePrice * (1 + totalMultiplier);
```

---

**Rule 1 Time-Based Pricing**

Price increases as the event date approaches. Tiers are sorted ascending by `daysBeforeEvent`. The loop finds the first tier where `daysUntilEvent <= tier.daysBeforeEvent` and breaks so the tightest (most urgent) match wins.

```typescript
// Sort ascending: [1 day, 7 days, 30 days]
const sortedTiers = [...rule.tiers].sort(
  (a, b) => a.daysBeforeEvent - b.daysBeforeEvent,
);

for (const tier of sortedTiers) {
  if (daysUntilEvent <= tier.daysBeforeEvent) {
    rawMultiplier = tier.priceMultiplier;
    break; // stop at first match = tightest tier
  }
}
```

Example: event is 3 days away → `3 <= 1` is false (skip), `3 <= 7` is true → matches +20%, breaks.

Default tiers:

| Days Until Event | Price Increase |
| ---------------- | -------------- |
| 30+ days         | +0%            |
| ≤ 7 days         | +20%           |
| ≤ 1 day          | +50%           |

---

**Rule 2 -Demand-Based Pricing**

Booking velocity in the last N minutes (`rule.windowMinutes`) drives this. Tiers are sorted descending by `bookingsThreshold` so the highest threshold that is met wins first.

```typescript
// Sort descending: [20 bookings, 10 bookings, 5 bookings]
const sortedTiers = [...rule.tiers].sort(
  (a, b) => b.bookingsThreshold - a.bookingsThreshold,
);

for (const tier of sortedTiers) {
  if (recentBookings >= tier.bookingsThreshold) {
    rawMultiplier = tier.priceMultiplier;
    break; // highest matching threshold
  }
}
```

Example: 22 recent bookings → `22 >= 20` is true → matches +25%, breaks.

Default tiers:

| Bookings in Window | Price Increase |
| ------------------ | -------------- |
| ≥ 5                | +10%           |
| ≥ 10               | +15%           |
| ≥ 20               | +25%           |

---

**Rule 3 -Inventory-Based Pricing**

Remaining ticket percentage determines the multiplier. The implementation iterates tiers from largest threshold to smallest (descending), and keeps overwriting `rawMultiplier` on every match so the tightest (smallest) matching threshold is what survives at the end.

```typescript
const remainingPercent = (remaining / context.totalTickets) * 100;

// Sort ascending first: [10%, 20%, 50%]
const sortedTiers = [...rule.tiers].sort(
  (a, b) => a.remainingPercentBelow - b.remainingPercentBelow,
);

// Iterate descending -last overwrite = tightest threshold
for (let i = sortedTiers.length - 1; i >= 0; i--) {
  const tier = sortedTiers[i]!;
  if (remainingPercent < tier.remainingPercentBelow) {
    rawMultiplier = tier.priceMultiplier;
    matchedTier = `<${tier.remainingPercentBelow}% remaining`;
  }
}
```

Example: 15% remaining → below 50% ✓, below 20% ✓, below 10% ✗ → tightest match is `<20%` → +25%.

Default tiers:

| Remaining Tickets | Price Increase |
| ----------------- | -------------- |
| < 50%             | +10%           |
| < 20%             | +25%           |
| < 10%             | +40%           |

---

### Configurable Weights via Environment Variables

Each rule's raw multiplier is scaled by a weight before summing:

```typescript
function getWeights() {
  return {
    timeBased: parseFloat(process.env['PRICING_WEIGHT_TIME'] || '1.0'),
    demandBased: parseFloat(process.env['PRICING_WEIGHT_DEMAND'] || '1.0'),
    inventoryBased: parseFloat(
      process.env['PRICING_WEIGHT_INVENTORY'] || '1.0',
    ),
  };
}

// Each rule: weightedMultiplier = rawMultiplier × weight
```

Setting a weight to `0.0` disables that rule entirely without any code change. Setting it to `0.5` halves its contribution.

### Floor / Ceiling Clamping

```typescript
if (finalPrice < context.priceFloor) {
  finalPrice = context.priceFloor;
  wasCapped = true;
  capDirection = 'floor';
} else if (finalPrice > context.priceCeiling) {
  finalPrice = context.priceCeiling;
  wasCapped = true;
  capDirection = 'ceiling';
}
finalPrice = Math.round(finalPrice * 100) / 100; // always 2 decimal places
```

The `PriceBreakdown` response includes `wasCapped` and `capDirection` so the frontend can show the user why a price stopped increasing.

### Full Calculation Example

```
Event: ₹1000 base | 3 days away | 22 recent bookings | 15% tickets remaining
priceFloor = ₹500  | priceCeiling = ₹2000 | all weights = 1.0

Time rule:      daysUntilEvent=3 → matches ≤7 days   → rawMultiplier = 0.20
Demand rule:    22 bookings      → matches ≥20 thresh → rawMultiplier = 0.25
Inventory rule: 15% remaining   → matches <20%       → rawMultiplier = 0.25

totalMultiplier    = (0.20×1.0) + (0.25×1.0) + (0.25×1.0) = 0.70
rawCalculatedPrice = 1000 × (1 + 0.70) = ₹1700
finalPrice         = clamp(1700, 500, 2000) = ₹1700 ✓
```

### Pricing Rules Stored as JSONB

Rules are stored in a `pricingRules` JSONB column (`jsonb('pricing_rules')` in the Drizzle schema) on the `events` table. This means each event carries its own custom tier configuration a concert can have aggressive surge pricing while a corporate seminar stays flat. There is no global pricing config; rules travel with the event record and are typed via `PricingRulesConfig` from `@repo/database`.

### Price at Display vs. Price at Booking

Price is calculated in two places. On `GET /events` and `GET /events/:id`, the current state is used for display. On `POST /bookings`, price is recalculated inside the Drizzle transaction using the locked row's latest state so the `pricePerTicket` snapshot saved to the bookings table always reflects the price valid at the exact moment of purchase, not a stale value from the list page.

---

## 2. Concurrency Problem -How It Was Solved

### The Problem

When two users simultaneously try to book the last ticket, both requests read `bookedTickets = 0`, both see `remaining = 1`, both pass the capacity check, and both insert a booking row. The event ends up `bookedTickets = 2` against `totalTickets = 1`. This is overbooking.

### The Solution -Drizzle Transaction + PostgreSQL `FOR UPDATE`

The entire critical section runs inside a Drizzle `db.transaction()`. Inside that transaction, the event row is fetched with a row-level write lock using Drizzle's `.for("update")`:

```typescript
// bookings.service.ts -critical section inside db.transaction()
await this.db.transaction(async (tx) => {
  // 1. Lock the event row -concurrent transactions must WAIT here
  const [event] = await tx
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .for('update'); // ← PostgreSQL SELECT ... FOR UPDATE

  if (!event) throw new ResourceNotFoundException('Event', eventId);

  // 2. Capacity check on the NOW-locked, up-to-date row
  const remaining = event.totalTickets - event.bookedTickets;
  if (remaining < quantity) {
    throw new InsufficientTicketsException(remaining, quantity);
  }

  // 3. Calculate price inside the lock (uses locked inventory state)
  const priceBreakdown = this.pricingService.calculatePrice({
    ...event,
    recentBookingsCount,
  });

  // 4. Insert booking row (price snapshot saved here)
  const [booking] = await tx
    .insert(bookings)
    .values({
      eventId,
      userEmail,
      quantity,
      pricePerTicket: priceBreakdown.finalPrice,
      totalPrice: priceBreakdown.finalPrice * quantity,
    })
    .returning();

  // 5. Increment bookedTickets + persist currentPrice snapshot
  await tx
    .update(events)
    .set({
      bookedTickets: event.bookedTickets + quantity,
      currentPrice: String(priceBreakdown.finalPrice),
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  return booking;
});
```

### Why This Prevents Overbooking

`.for("update")` tells PostgreSQL to acquire an exclusive write lock on the matched row before returning it. Any other transaction attempting the same lock on the same row is blocked until the first transaction commits or rolls back. When Transaction B finally proceeds, it reads the updated `bookedTickets` that Transaction A wrote the capacity check correctly finds zero remaining tickets and throws `InsufficientTicketsException` → HTTP `409 Conflict`.

The lock is **row-level**, not table-level. Two different events can be booked simultaneously with zero contention between them.

### Why Not Application-Level Locks

In-memory locks (a `Map` or mutex in Node.js) break the moment you run more than one API instance. PostgreSQL row-level locking is enforced at the database layer correct whether you run one server or twenty, with no extra infrastructure.

### Proven by Automated Concurrency Tests

Three scenarios in `bookings.concurrency.spec.ts` verify this using independent `postgres` clients per request (each with `max: 1` connection) and `Promise.all` for true simultaneity:

| Scenario            | Setup                                                  | Expected Result                      | DB Verification                   |
| ------------------- | ------------------------------------------------------ | ------------------------------------ | --------------------------------- |
| A -Last ticket race | 1 total ticket, 2 simultaneous requests (qty 1)        | Exactly 1 success, 1 failure         | `bookedTickets=1`, booking rows=1 |
| B -Bulk race        | 5 total tickets, 10 simultaneous requests (qty 5 each) | Exactly 1 success, 9 failures        | `bookedTickets=5`, booking rows=1 |
| C -Both succeed     | 2 total tickets, 2 simultaneous requests (qty 1 each)  | Both succeed (2 success, 0 failures) | `bookedTickets=2`, booking rows=2 |

Tests also assert DB state directly not just HTTP responses to confirm no phantom rows exist and `bookedTickets` never exceeds `totalTickets`.

---

## 3. Monorepo Architecture

The project uses Turborepo with this workspace layout:

```
packages/
  database/    → Drizzle schema, postgres.js client, seed script (@repo/database)
apps/
  api/         → NestJS backend (port 3001)
  web/         → Next.js 15 frontend (port 3000)
```

`@repo/database` is a shared workspace package imported by both `apps/api` and `apps/web`. The Drizzle schema is the single source of truth -`InferSelectModel` / `InferInsertModel` types flow from there into both applications. Turborepo's task graph ensures `packages/database` is always compiled before either app.

### Why NestJS

NestJS's module-scoped dependency injection naturally maps to the five domains in this project. Each domain (`pricing`, `events`, `bookings`, `analytics`, `seed`) is a self-contained module. `PricingModule` exports `PricingService` and is imported by both `EventsModule` and `BookingsModule` -a clean, explicit dependency graph with no circular dependencies.

### Why Drizzle ORM

Drizzle keeps SQL transparent. `.for("update")` for the concurrency lock, aggregation queries for analytics (`sum`, `avg`, `count`), and conditional updates on `bookedTickets` are all expressed in Drizzle's typed query builder -no magic, no N+1 surprises. Schema is managed with `drizzle-kit push` during development and migrations for production.

---

## 4. Trade-offs Made

**Demand rule `windowMinutes` is not fully wired.** The `pricingRules` JSONB stores `windowMinutes` per demand rule. However, the bookings service currently passes a fixed 60-minute window to the Drizzle count query rather than reading `windowMinutes` from each rule's config dynamically. Properly wiring it would require a pre-pass over rules before building `PricingContext`.

**`GET /events/:id` is not cached.** The list endpoint caches for 30 seconds via Upstash Redis, but the detail endpoint hits the database on every request. For high-traffic individual events this would be a bottleneck.

**No reservation/hold system.** Users go straight from the event page to a committed booking. A real ticketing platform would hold inventory for a few minutes during checkout. The race window between price-display and booking completion exists.

**Admin auth is a hardcoded API key.** `x-api-key` header checked against `ADMIN_API_KEY` env is fine for a take-home but would be replaced with JWT + RBAC in production.

**`events:all` cache not invalidated on event creation.** When a new event is created via `POST /events`, the Redis event list cache should be purged. Currently it expires naturally after 30 seconds.

---

## 5. What I Would Improve With More Time

1. **Per-rule demand windows** -read `rule.windowMinutes` from each rule's JSONB config and pass it dynamically to the Drizzle count query instead of hardcoding 60 minutes.
2. **Reservation system** -a `reservations` table with TTL-based expiry (BullMQ delayed job) so inventory is held during checkout, eliminating the display-to-booking price race.
3. **Event detail caching** -add Redis cache with a short TTL (10-15s) and booking-triggered invalidation for `GET /events/:id`.
4. **Cache invalidation on event creation** -purge `events:all` from Redis when `POST /events` succeeds.
5. **Proper auth** -replace the hardcoded API key with JWT + refresh tokens and NestJS `@Roles()` guards.
6. **Booking cancellation** -decrement `bookedTickets`, release inventory, recalculate `currentPrice` inside a transaction.
7. **Queue-based booking for hot events** -route booking requests through BullMQ to serialize demand without holding DB locks for extended durations under extreme load.
8. **Frontend real-time updates** -replace 30-second polling on the event detail page with Server-Sent Events so price changes appear immediately.

---

## Summary

The two hardest parts of this assignment were the pricing engine and the concurrency control. The pricing engine is a pure TypeScript service -deterministic, weight-configurable via environment variables, and fully unit-testable by injecting a `now` timestamp. Each rule has isolated tier-matching logic: ascending sort + first break for time, descending sort + first break for demand, and a full descending pass for inventory to find the tightest threshold.

Concurrency is solved at the database layer: Drizzle's `.for("update")` inside `db.transaction()` serializes access to the event row using PostgreSQL's native row-level locking. No application-level locks, no global mutexes -just PostgreSQL doing what it was built for. Three automated concurrency tests with real independent database connections prove it works under genuine simultaneity.
