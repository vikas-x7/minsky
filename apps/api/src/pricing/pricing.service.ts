import { Injectable, Logger } from '@nestjs/common';
import type {
  PricingRulesConfig,
  PricingRule,
  TimeBasedRule,
  DemandBasedRule,
  InventoryBasedRule,
} from '@repo/database';

// ─── Types for pricing calculation ──────────────────────────────────────────

export interface PricingContext {
  eventId?: string;
  basePrice: number;
  priceFloor: number;
  priceCeiling: number;
  eventDate: Date;
  totalTickets: number;
  bookedTickets: number;
  recentBookingsCount: number; // bookings within the demand window
  pricingRules: PricingRulesConfig;
  now?: Date; // injectable for testing
}

export interface RuleAdjustment {
  ruleName: string;
  rawMultiplier: number;
  weight: number;
  weightedMultiplier: number;
  description: string;
}

export interface PriceBreakdown {
  basePrice: number;
  adjustments: RuleAdjustment[];
  totalMultiplier: number;
  rawCalculatedPrice: number;
  finalPrice: number;
  priceFloor: number;
  priceCeiling: number;
  wasCapped: boolean;
  capDirection?: 'floor' | 'ceiling';
}

// ─── Configurable weights (via environment variables) ───────────────────────

function getWeights() {
  return {
    timeBased: parseFloat(process.env['PRICING_WEIGHT_TIME'] || '1.0'),
    demandBased: parseFloat(process.env['PRICING_WEIGHT_DEMAND'] || '1.0'),
    inventoryBased: parseFloat(
      process.env['PRICING_WEIGHT_INVENTORY'] || '1.0',
    ),
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  /**
   * Calculate the current price for an event with full breakdown.
   *
   * Formula: currentPrice = basePrice × (1 + Σ(weighted adjustments))
   *
   * Each rule produces a raw multiplier. The weighted multiplier = rawMultiplier × weight.
   * The sum of all weighted multipliers is added to 1, then multiplied by basePrice.
   * Result is clamped between priceFloor and priceCeiling.
   */
  calculatePrice(context: PricingContext): PriceBreakdown {
    const weights = getWeights();
    const now = context.now || new Date();
    const adjustments: RuleAdjustment[] = [];

    for (const rule of context.pricingRules.rules) {
      const adjustment = this.evaluateRule(rule, context, now, weights);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    const totalMultiplier = adjustments.reduce(
      (sum, adj) => sum + adj.weightedMultiplier,
      0,
    );

    const rawCalculatedPrice = context.basePrice * (1 + totalMultiplier);

    // Clamp between floor and ceiling
    let finalPrice = rawCalculatedPrice;
    let wasCapped = false;
    let capDirection: 'floor' | 'ceiling' | undefined;

    if (finalPrice < context.priceFloor) {
      finalPrice = context.priceFloor;
      wasCapped = true;
      capDirection = 'floor';
    } else if (finalPrice > context.priceCeiling) {
      finalPrice = context.priceCeiling;
      wasCapped = true;
      capDirection = 'ceiling';
    }

    // Round to 2 decimal places
    finalPrice = Math.round(finalPrice * 100) / 100;

    if (process.env['NODE_ENV'] === 'development') {
      this.logger.debug(
        `Price calculated - eventId: ${context.eventId ?? 'unknown'} - price: ${finalPrice} - multiplier: ${totalMultiplier.toFixed(2)}`,
      );
    }

    if (wasCapped) {
      this.logger.log(
        `Price ${capDirection} hit - eventId: ${context.eventId ?? 'unknown'} - raw: ${rawCalculatedPrice.toFixed(2)} - final: ${finalPrice}`,
      );
    }

    return {
      basePrice: context.basePrice,
      adjustments,
      totalMultiplier,
      rawCalculatedPrice: Math.round(rawCalculatedPrice * 100) / 100,
      finalPrice,
      priceFloor: context.priceFloor,
      priceCeiling: context.priceCeiling,
      wasCapped,
      capDirection,
    };
  }

  /**
   * Evaluate a single pricing rule and return the adjustment.
   */
  private evaluateRule(
    rule: PricingRule,
    context: PricingContext,
    now: Date,
    weights: ReturnType<typeof getWeights>,
  ): RuleAdjustment | null {
    switch (rule.type) {
      case 'time_based':
        return this.evaluateTimeBasedRule(
          rule,
          context,
          now,
          weights.timeBased,
        );
      case 'demand_based':
        return this.evaluateDemandBasedRule(rule, context, weights.demandBased);
      case 'inventory_based':
        return this.evaluateInventoryBasedRule(
          rule,
          context,
          weights.inventoryBased,
        );
      default:
        return null;
    }
  }

  /**
   * Time-Based Rule: Price increases as event date approaches.
   *
   * Tiers are sorted by daysBeforeEvent descending.
   * We find the first tier where daysUntilEvent <= daysBeforeEvent.
   * Example: daysBeforeEvent=7, priceMultiplier=0.20
   *   → if event is within 7 days, apply +20%
   */
  private evaluateTimeBasedRule(
    rule: TimeBasedRule,
    context: PricingContext,
    now: Date,
    weight: number,
  ): RuleAdjustment {
    const msUntilEvent = context.eventDate.getTime() - now.getTime();
    const daysUntilEvent = msUntilEvent / (1000 * 60 * 60 * 24);

    // Sort tiers by daysBeforeEvent ascending (smallest first = most urgent)
    const sortedTiers = [...rule.tiers].sort(
      (a, b) => a.daysBeforeEvent - b.daysBeforeEvent,
    );

    let rawMultiplier = 0;
    let matchedTier = '30+ days (base price)';

    // Find the most aggressive tier that applies
    // Tiers are like: [1 day → +50%, 7 days → +20%, 30 days → +0%]
    // If event is 3 days away, we match the 7-day tier (+20%)
    for (const tier of sortedTiers) {
      if (daysUntilEvent <= tier.daysBeforeEvent) {
        rawMultiplier = tier.priceMultiplier;
        matchedTier = `≤${tier.daysBeforeEvent} days`;
        break;
      }
    }

    return {
      ruleName: 'Time-Based Pricing',
      rawMultiplier,
      weight,
      weightedMultiplier: rawMultiplier * weight,
      description:
        daysUntilEvent <= 0
          ? `Event has passed or is today`
          : `${Math.ceil(daysUntilEvent)} days until event (tier: ${matchedTier}, +${(rawMultiplier * 100).toFixed(0)}%)`,
    };
  }

  /**
   * Demand-Based Rule: Price increases when booking velocity is high.
   *
   * Looks at how many bookings happened in the recent window.
   * Tiers sorted by threshold ascending. We find the highest threshold exceeded.
   */
  private evaluateDemandBasedRule(
    rule: DemandBasedRule,
    context: PricingContext,
    weight: number,
  ): RuleAdjustment {
    const recentBookings = context.recentBookingsCount;

    // Sort tiers by threshold descending (highest first)
    const sortedTiers = [...rule.tiers].sort(
      (a, b) => b.bookingsThreshold - a.bookingsThreshold,
    );

    let rawMultiplier = 0;
    let matchedTier = 'normal demand';

    // Find the highest threshold that is met
    for (const tier of sortedTiers) {
      if (recentBookings >= tier.bookingsThreshold) {
        rawMultiplier = tier.priceMultiplier;
        matchedTier = `≥${tier.bookingsThreshold} bookings in ${rule.windowMinutes}min`;
        break;
      }
    }

    return {
      ruleName: 'Demand-Based Pricing',
      rawMultiplier,
      weight,
      weightedMultiplier: rawMultiplier * weight,
      description: `${recentBookings} recent bookings (tier: ${matchedTier}, +${(rawMultiplier * 100).toFixed(0)}%)`,
    };
  }

  /**
   * Inventory-Based Rule: Price increases as tickets sell out.
   *
   * Calculates remaining percentage and finds the matching tier.
   * Tiers sorted by remainingPercentBelow descending (highest first).
   * We find the highest threshold that the remaining percentage is below.
   */
  private evaluateInventoryBasedRule(
    rule: InventoryBasedRule,
    context: PricingContext,
    weight: number,
  ): RuleAdjustment {
    const remaining = context.totalTickets - context.bookedTickets;
    const remainingPercent =
      context.totalTickets > 0 ? (remaining / context.totalTickets) * 100 : 0;

    // Sort tiers by remainingPercentBelow ascending (lowest threshold first)
    // This way we find the most specific (tightest) matching tier
    const sortedTiers = [...rule.tiers].sort(
      (a, b) => a.remainingPercentBelow - b.remainingPercentBelow,
    );

    let rawMultiplier = 0;
    let matchedTier = 'adequate inventory';

    // Find the most specific (smallest) threshold that the remaining percent is below.
    // Since tiers are sorted ascending, we iterate all and keep overwriting —
    // the last match is the broadest tier, but we want the tightest match.
    // Actually, let's iterate descending to find the tightest threshold first.
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i]!;
      if (remainingPercent < tier.remainingPercentBelow) {
        // Keep looking for a tighter (lower) threshold
        rawMultiplier = tier.priceMultiplier;
        matchedTier = `<${tier.remainingPercentBelow}% remaining`;
      }
    }

    return {
      ruleName: 'Inventory-Based Pricing',
      rawMultiplier,
      weight,
      weightedMultiplier: rawMultiplier * weight,
      description: `${remainingPercent.toFixed(1)}% tickets remaining (${remaining}/${context.totalTickets}) (tier: ${matchedTier}, +${(rawMultiplier * 100).toFixed(0)}%)`,
    };
  }
}
