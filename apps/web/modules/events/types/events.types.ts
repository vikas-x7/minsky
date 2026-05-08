import type { PricingRulesConfig } from '@repo/database';

export interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  venue: string;
  totalTickets: number;
  bookedTickets: number;
  remainingTickets: number;
  basePrice: number;
  currentPrice: number;
  priceFloor: number;
  priceCeiling: number;
  pricingRules?: PricingRulesConfig;
  createdAt: string;
  updatedAt: string;
  priceBreakdown?: PriceBreakdown;
}

export interface PriceAdjustment {
  rule: string;
  label: string;
  weight: number;
  rawAdjustment: number;
  weightedAdjustment: number;
  description: string;
}

export interface PriceBreakdown {
  basePrice: number;
  currentPrice: number;
  adjustments: PriceAdjustment[];
  totalAdjustmentPercentage: number;
  priceFloor?: number;
  priceCeiling?: number;
}

export interface PriceSnapshot {
  eventId: string;
  currentPrice: number;
  basePrice: number;
  remainingTickets: number;
  updatedAt: string;
}
