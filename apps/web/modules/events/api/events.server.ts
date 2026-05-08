import { type PricingRule, type PricingRulesConfig } from '@repo/database';
import { getDb } from '@/lib/db';
import type {
  Event,
  PriceAdjustment,
  PriceBreakdown,
} from '@/modules/events/types/events.types';

interface DbEventRow {
  id: string;
  name: string;
  description: string | null;
  date: Date | string;
  venue: string;
  total_tickets: number;
  booked_tickets: number;
  base_price: string;
  current_price: string;
  price_floor: string;
  price_ceiling: string;
  pricing_rules: PricingRulesConfig;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ServerEvent {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  venue: string;
  totalTickets: number;
  bookedTickets: number;
  basePrice: string;
  currentPrice: string;
  priceFloor: string;
  priceCeiling: string;
  pricingRules: PricingRulesConfig;
  createdAt: Date;
  updatedAt: Date;
}

type SqlQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<DbEventRow[]>;

const weights = {
  timeBased: Number(process.env.PRICING_WEIGHT_TIME || '1'),
  demandBased: Number(process.env.PRICING_WEIGHT_DEMAND || '1'),
  inventoryBased: Number(process.env.PRICING_WEIGHT_INVENTORY || '1'),
};

function evaluateRule(
  rule: PricingRule,
  event: ServerEvent,
  recentBookingsCount: number,
): PriceAdjustment {
  if (rule.type === 'time_based') {
    const daysUntil =
      (event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const tier = [...rule.tiers]
      .sort((a, b) => a.daysBeforeEvent - b.daysBeforeEvent)
      .find((item) => daysUntil <= item.daysBeforeEvent);
    const raw = tier?.priceMultiplier ?? 0;

    return {
      rule: 'time_based',
      label: 'Time-Based Pricing',
      weight: weights.timeBased,
      rawAdjustment: raw,
      weightedAdjustment: raw * weights.timeBased,
      description:
        daysUntil <= 0
          ? 'Event is today or has passed'
          : `${Math.ceil(daysUntil)} days until event`,
    };
  }

  if (rule.type === 'demand_based') {
    const tier = [...rule.tiers]
      .sort((a, b) => b.bookingsThreshold - a.bookingsThreshold)
      .find((item) => recentBookingsCount >= item.bookingsThreshold);
    const raw = tier?.priceMultiplier ?? 0;

    return {
      rule: 'demand_based',
      label: 'Demand-Based Pricing',
      weight: weights.demandBased,
      rawAdjustment: raw,
      weightedAdjustment: raw * weights.demandBased,
      description: `${recentBookingsCount} bookings in the last ${rule.windowMinutes} minutes`,
    };
  }

  const remainingPercent =
    event.totalTickets > 0
      ? ((event.totalTickets - event.bookedTickets) / event.totalTickets) * 100
      : 0;
  const tier = [...rule.tiers]
    .sort((a, b) => a.remainingPercentBelow - b.remainingPercentBelow)
    .find((item) => remainingPercent < item.remainingPercentBelow);
  const raw = tier?.priceMultiplier ?? 0;

  return {
    rule: 'inventory_based',
    label: 'Inventory-Based Pricing',
    weight: weights.inventoryBased,
    rawAdjustment: raw,
    weightedAdjustment: raw * weights.inventoryBased,
    description: `${remainingPercent.toFixed(1)}% tickets remaining`,
  };
}

function calculatePriceBreakdown(
  event: ServerEvent,
  recentBookingsCount: number,
): PriceBreakdown {
  const pricingRules = event.pricingRules as PricingRulesConfig;
  const adjustments = pricingRules.rules.map((rule) =>
    evaluateRule(rule, event, recentBookingsCount),
  );
  const totalAdjustmentPercentage = adjustments.reduce(
    (sum, adjustment) => sum + adjustment.weightedAdjustment,
    0,
  );
  const basePrice = Number(event.basePrice);
  const priceFloor = Number(event.priceFloor);
  const priceCeiling = Number(event.priceCeiling);
  const rawPrice = basePrice * (1 + totalAdjustmentPercentage);
  const currentPrice =
    Math.round(Math.min(Math.max(rawPrice, priceFloor), priceCeiling) * 100) /
    100;

  return {
    basePrice,
    currentPrice,
    adjustments,
    totalAdjustmentPercentage,
    priceFloor,
    priceCeiling,
  };
}

function serializeEvent(
  event: ServerEvent,
  priceBreakdown?: PriceBreakdown,
): Event {
  const currentPrice =
    priceBreakdown?.currentPrice ?? Number(event.currentPrice);

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date.toISOString(),
    venue: event.venue,
    totalTickets: event.totalTickets,
    bookedTickets: event.bookedTickets,
    remainingTickets: event.totalTickets - event.bookedTickets,
    basePrice: Number(event.basePrice),
    currentPrice,
    priceFloor: Number(event.priceFloor),
    priceCeiling: Number(event.priceCeiling),
    pricingRules: event.pricingRules,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    priceBreakdown,
  };
}

function normalizeRow(row: DbEventRow): ServerEvent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    date: new Date(row.date),
    venue: row.venue,
    totalTickets: row.total_tickets,
    bookedTickets: row.booked_tickets,
    basePrice: row.base_price,
    currentPrice: row.current_price,
    priceFloor: row.price_floor,
    priceCeiling: row.price_ceiling,
    pricingRules: row.pricing_rules,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function getRecentBookingsCount(eventId: string) {
  const query = getDb().client as unknown as SqlQuery;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = (await query`
    select count(*)::int as count
    from bookings
    where event_id = ${eventId} and created_at >= ${windowStart}
  `) as unknown as Array<{ count: number }>;

  return result[0]?.count ?? 0;
}

export async function getEventsFromDb(): Promise<Event[]> {
  const query = getDb().client as unknown as SqlQuery;
  const rows = await query`
    select *
    from events
    order by date desc
  `;
  return Promise.all(
    rows.map(async (row) => {
      const event = normalizeRow(row);
      const recentBookingsCount = await getRecentBookingsCount(event.id);
      return serializeEvent(
        event,
        calculatePriceBreakdown(event, recentBookingsCount),
      );
    }),
  );
}

export async function getEventFromDb(id: string): Promise<Event | null> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return null;
  }

  const query = getDb().client as unknown as SqlQuery;
  const rows = await query`
    select *
    from events
    where id = ${id}
    limit 1
  `;
  const row = rows[0];

  if (!row) {
    return null;
  }

  const event = normalizeRow(row);
  const recentBookingsCount = await getRecentBookingsCount(event.id);
  return serializeEvent(
    event,
    calculatePriceBreakdown(event, recentBookingsCount),
  );
}
