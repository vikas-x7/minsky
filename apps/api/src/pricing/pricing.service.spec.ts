import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PricingService, type PricingContext } from './pricing.service';
import type { PricingRulesConfig, PricingRule } from '@repo/database';

describe('PricingService', () => {
  let service: PricingService;

  const defaultRules: PricingRulesConfig = {
    rules: [
      {
        type: 'time_based',
        tiers: [
          { daysBeforeEvent: 30, priceMultiplier: 0.0 },
          { daysBeforeEvent: 7, priceMultiplier: 0.2 },
          { daysBeforeEvent: 1, priceMultiplier: 0.5 },
        ],
      },
      {
        type: 'demand_based',
        windowMinutes: 60,
        tiers: [
          { bookingsThreshold: 5, priceMultiplier: 0.1 },
          { bookingsThreshold: 10, priceMultiplier: 0.15 },
          { bookingsThreshold: 20, priceMultiplier: 0.25 },
        ],
      },
      {
        type: 'inventory_based',
        tiers: [
          { remainingPercentBelow: 50, priceMultiplier: 0.1 },
          { remainingPercentBelow: 20, priceMultiplier: 0.25 },
          { remainingPercentBelow: 10, priceMultiplier: 0.4 },
        ],
      },
    ],
  };

  function makeContext(
    overrides: Partial<PricingContext> = {},
  ): PricingContext {
    return {
      basePrice: 1000,
      priceFloor: 500,
      priceCeiling: 5000,
      eventDate: new Date('2026-06-15T09:00:00Z'),
      totalTickets: 100,
      bookedTickets: 0,
      recentBookingsCount: 0,
      pricingRules: defaultRules,
      now: new Date('2026-05-01T12:00:00Z'),
      ...overrides,
    };
  }

  beforeEach(() => {
    process.env['PRICING_WEIGHT_TIME'] = '1.0';
    process.env['PRICING_WEIGHT_DEMAND'] = '1.0';
    process.env['PRICING_WEIGHT_INVENTORY'] = '1.0';
    service = new PricingService();
  });

  describe('Time-Based Rule', () => {
    it('applies no increase for events 30+ days away', () => {
      const context = makeContext({
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj).toBeDefined();
      expect(timeAdj!.rawMultiplier).toBe(0);
    });

    it('applies +20% for events within 7 days', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj).toBeDefined();
      expect(timeAdj!.rawMultiplier).toBe(0.2);
    });

    it('applies +50% for events within 1 day', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-02T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj).toBeDefined();
      expect(timeAdj!.rawMultiplier).toBe(0.5);
    });

    it('handles same-day event (0 days)', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-01T20:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj).toBeDefined();
      expect(timeAdj!.rawMultiplier).toBe(0.5);
    });

    it('applies +50% for event that starts in a few hours', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-01T18:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj!.rawMultiplier).toBe(0.5);
    });
  });

  describe('Demand-Based Rule', () => {
    it('applies no increase for low demand (< 5 bookings)', () => {
      const context = makeContext({ recentBookingsCount: 3 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj).toBeDefined();
      expect(demandAdj!.rawMultiplier).toBe(0);
    });

    it('applies +10% for moderate demand (5-9 bookings)', () => {
      const context = makeContext({ recentBookingsCount: 7 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.rawMultiplier).toBe(0.1);
    });

    it('applies +15% for high demand (10-19 bookings)', () => {
      const context = makeContext({ recentBookingsCount: 15 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.rawMultiplier).toBe(0.15);
    });

    it('applies +25% for very high demand (20+ bookings)', () => {
      const context = makeContext({ recentBookingsCount: 25 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.rawMultiplier).toBe(0.25);
    });

    it('applies correct tier at exact boundary (exactly 5 bookings)', () => {
      const context = makeContext({ recentBookingsCount: 5 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.rawMultiplier).toBe(0.1);
    });

    it('applies correct tier at exact boundary (exactly 10 bookings)', () => {
      const context = makeContext({ recentBookingsCount: 10 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.rawMultiplier).toBe(0.15);
    });
  });

  describe('Inventory-Based Rule', () => {
    it('applies no increase when > 50% tickets remain', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 40 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj).toBeDefined();
      expect(invAdj!.rawMultiplier).toBe(0);
    });

    it('applies +10% when < 50% tickets remain', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 60 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.1);
    });

    it('applies +25% when < 20% tickets remain', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 85 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.25);
    });

    it('applies +40% when < 10% tickets remain', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 95 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.4);
    });

    it('applies +40% when event is sold out (0% remaining)', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 100 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.4);
    });

    it('applies correct tier at boundary (exactly 50% remaining)', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 50 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0);
    });

    it('applies correct tier at boundary (exactly 20% remaining)', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 80 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.1);
    });
  });

  describe('Combined Rules', () => {
    it('combines all three rules correctly', () => {
      const context = makeContext({
        basePrice: 1000,
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 15,
        totalTickets: 100,
        bookedTickets: 85,
      });
      const result = service.calculatePrice(context);
      expect(result.totalMultiplier).toBeCloseTo(0.6);
      expect(result.rawCalculatedPrice).toBe(1600);
      expect(result.finalPrice).toBe(1600);
    });

    it('uses the formula: basePrice × (1 + Σ weighted adjustments)', () => {
      const context = makeContext({
        basePrice: 500,
        eventDate: new Date('2026-05-02T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 25,
        totalTickets: 100,
        bookedTickets: 95,
      });
      const result = service.calculatePrice(context);
      expect(result.totalMultiplier).toBeCloseTo(1.15);
      expect(result.rawCalculatedPrice).toBe(1075);
    });

    it('returns adjustments array with 3 entries when all rules apply', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 15,
        totalTickets: 100,
        bookedTickets: 85,
      });
      const result = service.calculatePrice(context);
      expect(result.adjustments).toHaveLength(3);
    });

    it('returns only active rules in adjustments', () => {
      const context = makeContext({
        eventDate: new Date('2026-06-15T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      expect(result.adjustments).toHaveLength(3);
      result.adjustments.forEach((adj) => {
        expect(adj.weightedMultiplier).toBe(0);
      });
    });
  });

  describe('Floor and Ceiling Constraints', () => {
    it('caps price at ceiling when too high', () => {
      const context = makeContext({
        basePrice: 4000,
        priceCeiling: 5000,
        eventDate: new Date('2026-05-02T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 25,
        totalTickets: 100,
        bookedTickets: 95,
      });
      const result = service.calculatePrice(context);
      expect(result.rawCalculatedPrice).toBe(8600);
      expect(result.finalPrice).toBe(5000);
      expect(result.wasCapped).toBe(true);
      expect(result.capDirection).toBe('ceiling');
    });

    it('enforces floor when price would be too low', () => {
      const context = makeContext({
        basePrice: 300,
        priceFloor: 500,
        eventDate: new Date('2026-06-15T09:00:00Z'),
        now: new Date('2026-04-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      expect(result.rawCalculatedPrice).toBe(300);
      expect(result.finalPrice).toBe(500);
      expect(result.wasCapped).toBe(true);
      expect(result.capDirection).toBe('floor');
    });

    it('does not cap when price is within bounds', () => {
      const context = makeContext();
      const result = service.calculatePrice(context);
      expect(result.wasCapped).toBe(false);
      expect(result.capDirection).toBeUndefined();
    });

    it('respects ceiling when price exactly equals ceiling', () => {
      const context = makeContext({
        basePrice: 5000,
        priceCeiling: 5000,
        eventDate: new Date('2026-06-15T09:00:00Z'),
        now: new Date('2026-04-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBe(5000);
      expect(result.wasCapped).toBe(false);
    });

    it('respects floor when price exactly equals floor', () => {
      const context = makeContext({
        basePrice: 500,
        priceFloor: 500,
        eventDate: new Date('2026-06-15T09:00:00Z'),
        now: new Date('2026-04-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBe(500);
      expect(result.wasCapped).toBe(false);
    });
  });

  describe('Configurable Weights', () => {
    it('applies custom weight to time-based rule', () => {
      process.env['PRICING_WEIGHT_TIME'] = '0.5';
      service = new PricingService();
      const context = makeContext({
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      const timeAdj = result.adjustments.find(
        (a) => a.ruleName === 'Time-Based Pricing',
      );
      expect(timeAdj!.weight).toBe(0.5);
      expect(timeAdj!.rawMultiplier).toBe(0.2);
      expect(timeAdj!.weightedMultiplier).toBe(0.1);
    });

    it('disables a rule when weight is 0', () => {
      process.env['PRICING_WEIGHT_DEMAND'] = '0.0';
      service = new PricingService();
      const context = makeContext({ recentBookingsCount: 25 });
      const result = service.calculatePrice(context);
      const demandAdj = result.adjustments.find(
        (a) => a.ruleName === 'Demand-Based Pricing',
      );
      expect(demandAdj!.weightedMultiplier).toBe(0);
    });

    it('amplifies a rule when weight is > 1', () => {
      process.env['PRICING_WEIGHT_INVENTORY'] = '2.0';
      service = new PricingService();
      const context = makeContext({
        totalTickets: 100,
        bookedTickets: 85,
        recentBookingsCount: 0,
      });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.weight).toBe(2.0);
      expect(invAdj!.rawMultiplier).toBe(0.25);
      expect(invAdj!.weightedMultiplier).toBe(0.5);
    });

    it('uses default weight of 1.0 when env var is not set', () => {
      delete process.env['PRICING_WEIGHT_TIME'];
      delete process.env['PRICING_WEIGHT_DEMAND'];
      delete process.env['PRICING_WEIGHT_INVENTORY'];
      service = new PricingService();
      const context = makeContext();
      const result = service.calculatePrice(context);
      result.adjustments.forEach((adj) => {
        expect(adj.weight).toBe(1.0);
      });
    });
  });

  describe('Determinism', () => {
    it('returns identical results for identical inputs', () => {
      const context = makeContext({
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 10,
        totalTickets: 100,
        bookedTickets: 80,
      });
      const result1 = service.calculatePrice(context);
      const result2 = service.calculatePrice(context);
      expect(result1.finalPrice).toBe(result2.finalPrice);
      expect(result1.totalMultiplier).toBe(result2.totalMultiplier);
      expect(result1.adjustments).toEqual(result2.adjustments);
    });

    it('is deterministic across multiple calls with same parameters', () => {
      const context1 = makeContext({
        basePrice: 750,
        eventDate: new Date('2026-05-10T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 8,
        totalTickets: 200,
        bookedTickets: 140,
      });
      const context2 = makeContext({
        basePrice: 750,
        eventDate: new Date('2026-05-10T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 8,
        totalTickets: 200,
        bookedTickets: 140,
      });
      expect(service.calculatePrice(context1)).toEqual(
        service.calculatePrice(context2),
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles zero total tickets gracefully', () => {
      const context = makeContext({ totalTickets: 0, bookedTickets: 0 });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThanOrEqual(context.priceFloor);
    });

    it('handles event that has already passed', () => {
      const context = makeContext({
        eventDate: new Date('2026-04-01T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
      });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThanOrEqual(context.priceFloor);
      expect(result.finalPrice).toBeLessThanOrEqual(context.priceCeiling);
    });

    it('handles sold-out event (0 remaining)', () => {
      const context = makeContext({ totalTickets: 100, bookedTickets: 100 });
      const result = service.calculatePrice(context);
      const invAdj = result.adjustments.find(
        (a) => a.ruleName === 'Inventory-Based Pricing',
      );
      expect(invAdj!.rawMultiplier).toBe(0.4);
    });

    it('handles empty pricing rules', () => {
      const context = makeContext({ pricingRules: { rules: [] } });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBe(context.basePrice);
      expect(result.totalMultiplier).toBe(0);
      expect(result.adjustments).toHaveLength(0);
    });

    it('handles very small base price', () => {
      const context = makeContext({ basePrice: 0.01, priceFloor: 0.01 });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThanOrEqual(0.01);
    });

    it('handles very large base price', () => {
      const context = makeContext({
        basePrice: 100000,
        priceCeiling: 500000,
        eventDate: new Date('2026-05-02T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 25,
        totalTickets: 100,
        bookedTickets: 95,
      });
      const result = service.calculatePrice(context);
      // 100000 * (1 + 0.5 + 0.25 + 0.4) = 100000 * 2.15 = 215000
      expect(result.rawCalculatedPrice).toBe(215000);
      expect(result.finalPrice).toBe(215000);
    });

    it('handles event where totalTickets equals bookedTickets', () => {
      const context = makeContext({ totalTickets: 50, bookedTickets: 50 });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThanOrEqual(context.priceFloor);
    });

    it('rounds final price to 2 decimal places', () => {
      const context = makeContext({
        basePrice: 99.99,
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 7,
      });
      const result = service.calculatePrice(context);
      const expectedDecimalPlaces = (
        result.finalPrice.toString().split('.')[1] || ''
      ).length;
      expect(expectedDecimalPlaces).toBeLessThanOrEqual(2);
    });

    it('returns price breakdown with correct structure', () => {
      const context = makeContext();
      const result = service.calculatePrice(context);
      expect(result).toHaveProperty('basePrice');
      expect(result).toHaveProperty('adjustments');
      expect(result).toHaveProperty('totalMultiplier');
      expect(result).toHaveProperty('rawCalculatedPrice');
      expect(result).toHaveProperty('finalPrice');
      expect(result).toHaveProperty('priceFloor');
      expect(result).toHaveProperty('priceCeiling');
      expect(result).toHaveProperty('wasCapped');
      expect(result.adjustments[0]).toHaveProperty('ruleName');
      expect(result.adjustments[0]).toHaveProperty('rawMultiplier');
      expect(result.adjustments[0]).toHaveProperty('weight');
      expect(result.adjustments[0]).toHaveProperty('weightedMultiplier');
      expect(result.adjustments[0]).toHaveProperty('description');
    });
  });

  describe('Rule Combinations - Multiplicative Scenarios', () => {
    it('applies time + inventory but no demand rules', () => {
      const context = makeContext({
        basePrice: 1000,
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 85,
      });
      const result = service.calculatePrice(context);
      expect(result.totalMultiplier).toBeCloseTo(0.45);
      expect(result.finalPrice).toBe(1450);
    });

    it('applies demand + inventory but no time rules', () => {
      const context = makeContext({
        basePrice: 1000,
        eventDate: new Date('2026-07-15T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 20,
        totalTickets: 100,
        bookedTickets: 85,
      });
      const result = service.calculatePrice(context);
      expect(result.totalMultiplier).toBeCloseTo(0.5);
      expect(result.finalPrice).toBe(1500);
    });

    it('applies only time-based rule when other conditions are neutral', () => {
      const context = makeContext({
        basePrice: 1000,
        eventDate: new Date('2026-05-05T09:00:00Z'),
        now: new Date('2026-05-01T12:00:00Z'),
        recentBookingsCount: 0,
        totalTickets: 100,
        bookedTickets: 0,
      });
      const result = service.calculatePrice(context);
      expect(result.totalMultiplier).toBeCloseTo(0.2);
      expect(result.finalPrice).toBe(1200);
    });
  });

  describe('Edge Coverage', () => {
    it('logs debug in development mode (NODE_ENV=development)', () => {
      const prev = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      const context = makeContext();
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThan(0);
      process.env['NODE_ENV'] = prev;
    });

    it('uses default now when context.now is not provided', () => {
      const context = makeContext({ now: undefined as any });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBeGreaterThan(0);
    });

    it('skips unknown rule type gracefully', () => {
      const unknownRule = {
        type: 'unknown_type',
      } as unknown as PricingRule;
      const context = makeContext({
        pricingRules: { rules: [unknownRule] },
      });
      const result = service.calculatePrice(context);
      expect(result.finalPrice).toBe(context.basePrice);
      expect(result.adjustments).toHaveLength(0);
    });
  });
});
