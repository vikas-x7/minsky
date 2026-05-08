import { Injectable, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { events, bookings } from '@repo/database';
import { ResourceNotFoundException } from '../common/exceptions';
import { CacheService } from '../cache/cache.service';

export interface EventAnalytics {
  eventId: string;
  eventName: string;
  totalTickets: number;
  ticketsSold: number;
  ticketsRemaining: number;
  percentSold: number;
  totalRevenue: number;
  averagePrice: number;
  totalBookings: number;
  basePrice: number;
  currentPrice: number;
}

export interface SystemSummary {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  averageTicketPrice: number;
  totalBookings: number;
  soldOutEvents: number;
  upcomingEvents: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(CacheService)
    private readonly cacheService: CacheService,
  ) {}

  async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    const cacheKey = `analytics:events:${eventId}`;
    const cached = await this.cacheService.get<EventAnalytics>(cacheKey);
    if (cached) return cached;

    const db = this.databaseService.db;

    const eventResult = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    const event = eventResult[0];
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }

    const bookingStats = await db
      .select({
        totalBookings: sql<number>`count(*)::int`,
        totalTicketsSold: sql<number>`COALESCE(sum(${bookings.quantity}), 0)::int`,
        totalRevenue: sql<number>`COALESCE(sum(${bookings.totalPrice}::numeric), 0)::float`,
        averagePrice: sql<number>`COALESCE(avg(${bookings.pricePerTicket}::numeric), 0)::float`,
      })
      .from(bookings)
      .where(eq(bookings.eventId, eventId));

    const stats = bookingStats[0];

    const response: EventAnalytics = {
      eventId: event.id,
      eventName: event.name,
      totalTickets: event.totalTickets,
      ticketsSold: event.bookedTickets,
      ticketsRemaining: event.totalTickets - event.bookedTickets,
      percentSold:
        event.totalTickets > 0
          ? Math.round((event.bookedTickets / event.totalTickets) * 10000) / 100
          : 0,
      totalRevenue: stats?.totalRevenue ?? 0,
      averagePrice: Math.round((stats?.averagePrice ?? 0) * 100) / 100,
      totalBookings: stats?.totalBookings ?? 0,
      basePrice: parseFloat(event.basePrice),
      currentPrice: parseFloat(event.currentPrice),
    };

    await this.cacheService.set(cacheKey, response, 60);
    return response;
  }

  async getSystemSummary(): Promise<SystemSummary> {
    const cacheKey = 'analytics:summary';
    const cached = await this.cacheService.get<SystemSummary>(cacheKey);
    if (cached) return cached;

    const db = this.databaseService.db;

    const eventStats = await db
      .select({
        totalEvents: sql<number>`count(*)::int`,
        totalTicketsSold: sql<number>`COALESCE(sum(${events.bookedTickets}), 0)::int`,
        soldOutEvents: sql<number>`count(*) FILTER (WHERE ${events.bookedTickets} >= ${events.totalTickets})::int`,
        upcomingEvents: sql<number>`count(*) FILTER (WHERE ${events.date} > NOW())::int`,
      })
      .from(events);

    const bookingStats = await db
      .select({
        totalBookings: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`COALESCE(sum(${bookings.totalPrice}::numeric), 0)::float`,
        averagePrice: sql<number>`COALESCE(avg(${bookings.pricePerTicket}::numeric), 0)::float`,
      })
      .from(bookings);

    const eStats = eventStats[0];
    const bStats = bookingStats[0];

    const response: SystemSummary = {
      totalEvents: eStats?.totalEvents ?? 0,
      totalTicketsSold: eStats?.totalTicketsSold ?? 0,
      totalRevenue: bStats?.totalRevenue ?? 0,
      averageTicketPrice: Math.round((bStats?.averagePrice ?? 0) * 100) / 100,
      totalBookings: bStats?.totalBookings ?? 0,
      soldOutEvents: eStats?.soldOutEvents ?? 0,
      upcomingEvents: eStats?.upcomingEvents ?? 0,
    };

    await this.cacheService.set(cacheKey, response, 60);
    return response;
  }
}
