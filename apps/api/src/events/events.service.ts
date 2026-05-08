import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  PricingService,
  type PriceBreakdown,
} from '../pricing/pricing.service';
import { events, bookings, type PricingRulesConfig } from '@repo/database';
import { CreateEventDto } from './dto/create-event.dto';
import {
  ResourceNotFoundException,
  InternalServerException,
} from '../common/exceptions';
import { CacheService } from '../cache/cache.service';

export interface EventWithPricing {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  venue: string;
  totalTickets: number;
  bookedTickets: number;
  remainingTickets: number;
  basePrice: string;
  currentPrice: number;
  priceFloor: string;
  priceCeiling: string;
  priceBreakdown?: PriceBreakdown;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(PricingService)
    private readonly pricingService: PricingService,
    @Inject(CacheService)
    private readonly cacheService: CacheService,
  ) {}

  async findAll(): Promise<EventWithPricing[]> {
    const cacheKey = 'events:all';
    const cached = await this.cacheService.get<EventWithPricing[]>(cacheKey);
    if (cached) return cached;

    const db = this.databaseService.db;
    const allEvents = await db.select().from(events);
    this.logger.log(`Events fetched - count: ${allEvents.length}`);

    const results: EventWithPricing[] = [];
    for (const event of allEvents) {
      const recentBookingsCount = await this.getRecentBookingsCount(
        event.id,
        60,
      );

      const priceBreakdown = this.pricingService.calculatePrice({
        eventId: event.id,
        basePrice: parseFloat(event.basePrice),
        priceFloor: parseFloat(event.priceFloor),
        priceCeiling: parseFloat(event.priceCeiling),
        eventDate: event.date,
        totalTickets: event.totalTickets,
        bookedTickets: event.bookedTickets,
        recentBookingsCount,
        pricingRules: event.pricingRules,
      });

      results.push({
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venue,
        totalTickets: event.totalTickets,
        bookedTickets: event.bookedTickets,
        remainingTickets: event.totalTickets - event.bookedTickets,
        basePrice: event.basePrice,
        currentPrice: priceBreakdown.finalPrice,
        priceFloor: event.priceFloor,
        priceCeiling: event.priceCeiling,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      });
    }

    await this.cacheService.set(cacheKey, results, 30);
    return results;
  }

  async findOne(id: string): Promise<EventWithPricing> {
    const db = this.databaseService.db;
    const event = await db.select().from(events).where(eq(events.id, id));

    if (!event[0]) {
      this.logger.warn(`Event not found - eventId: ${id}`);
      throw new ResourceNotFoundException('Event', id);
    }

    const eventData = event[0];
    this.logger.log(`Event fetched - eventId: ${eventData.id}`);
    const recentBookingsCount = await this.getRecentBookingsCount(
      eventData.id,
      60,
    );

    const priceBreakdown = this.pricingService.calculatePrice({
      eventId: eventData.id,
      basePrice: parseFloat(eventData.basePrice),
      priceFloor: parseFloat(eventData.priceFloor),
      priceCeiling: parseFloat(eventData.priceCeiling),
      eventDate: eventData.date,
      totalTickets: eventData.totalTickets,
      bookedTickets: eventData.bookedTickets,
      recentBookingsCount,
      pricingRules: eventData.pricingRules,
    });

    return {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description,
      date: eventData.date,
      venue: eventData.venue,
      totalTickets: eventData.totalTickets,
      bookedTickets: eventData.bookedTickets,
      remainingTickets: eventData.totalTickets - eventData.bookedTickets,
      basePrice: eventData.basePrice,
      currentPrice: priceBreakdown.finalPrice,
      priceFloor: eventData.priceFloor,
      priceCeiling: eventData.priceCeiling,
      priceBreakdown,
      createdAt: eventData.createdAt,
      updatedAt: eventData.updatedAt,
    };
  }

  async create(dto: CreateEventDto): Promise<EventWithPricing> {
    const db = this.databaseService.db;

    const priceFloor = dto.priceFloor ?? dto.basePrice * 0.5;
    const priceCeiling = dto.priceCeiling ?? dto.basePrice * 2;

    const defaultPricingRules: PricingRulesConfig = {
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

    const inserted = await db
      .insert(events)
      .values({
        name: dto.name,
        description: dto.description || null,
        date: new Date(dto.date),
        venue: dto.venue,
        totalTickets: dto.totalTickets,
        bookedTickets: 0,
        basePrice: dto.basePrice.toFixed(2),
        currentPrice: dto.basePrice.toFixed(2),
        priceFloor: priceFloor.toFixed(2),
        priceCeiling: priceCeiling.toFixed(2),
        pricingRules: dto.pricingRules || defaultPricingRules,
      })
      .returning();

    if (!inserted[0]) {
      throw new InternalServerException('Failed to create event');
    }

    return this.findOne(inserted[0].id);
  }

  async getRecentBookingsCount(
    eventId: string,
    windowMinutes: number,
  ): Promise<number> {
    const db = this.databaseService.db;
    const windowStart = new Date(
      Date.now() - windowMinutes * 60 * 1000,
    ).toISOString();

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        sql`${bookings.eventId} = ${eventId} AND ${bookings.createdAt} >= ${windowStart}`,
      );

    return result[0]?.count ?? 0;
  }
}
