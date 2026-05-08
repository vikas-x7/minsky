import { z } from 'zod/v4';

export const pricingRulesSchema = z.object({
  timeBasedRule: z.object({
    enabled: z.boolean(),
    weight: z.number().min(0).max(1),
    thresholds: z.array(
      z.object({
        daysBeforeEvent: z.number().int().min(0),
        adjustment: z.number().min(0),
      }),
    ),
  }),
  demandBasedRule: z.object({
    enabled: z.boolean(),
    weight: z.number().min(0).max(1),
    bookingsThreshold: z.number().int().min(1),
    timeWindowMinutes: z.number().int().min(1),
    adjustment: z.number().min(0),
  }),
  inventoryBasedRule: z.object({
    enabled: z.boolean(),
    weight: z.number().min(0).max(1),
    thresholds: z.array(
      z.object({
        remainingPercentage: z.number().min(0).max(100),
        adjustment: z.number().min(0),
      }),
    ),
  }),
});

export const eventSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  date: z.string(),
  venue: z.string().min(1),
  description: z.string(),
  totalTickets: z.number().int().min(1),
  bookedTickets: z.number().int().min(0),
  basePrice: z.number().min(0),
  currentPrice: z.number().min(0),
  floorPrice: z.number().min(0),
  ceilingPrice: z.number().min(0),
  pricingRules: pricingRulesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  date: z.string().min(1, 'Event date is required'),
  venue: z.string().min(1, 'Venue is required').max(200),
  description: z.string().max(2000).optional(),
  totalTickets: z.number().int().min(1, 'Must have at least 1 ticket'),
  basePrice: z.number().min(0, 'Base price must be positive'),
  floorPrice: z.number().min(0, 'Floor price must be positive'),
  ceilingPrice: z.number().min(0, 'Ceiling price must be positive'),
  pricingRules: pricingRulesSchema.optional(),
});

export const eventListSchema = z.array(eventSchema);

export type EventSchema = z.infer<typeof eventSchema>;
export type CreateEventSchema = z.infer<typeof createEventSchema>;
