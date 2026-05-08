import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { PricingService } from '../pricing/pricing.service';
import { events, bookings, type PricingRulesConfig } from '@repo/database';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  ResourceNotFoundException,
  InsufficientTicketsException,
  InternalServerException,
} from '../common/exceptions';
import { CacheService } from '../cache/cache.service';

export interface BookingResponse {
  id: string;
  eventId: string;
  userEmail: string;
  quantity: number;
  pricePerTicket: string;
  totalPrice: string;
  createdAt: Date;
  eventName?: string;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(PricingService)
    private readonly pricingService: PricingService,
    @Inject(CacheService)
    private readonly cacheService: CacheService,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<BookingResponse> {
    const db = this.databaseService.db;
    const maskedEmail = this.maskEmail(dto.userEmail);

    this.logger.log(
      `Booking attempt - ${maskedEmail} - eventId: ${dto.eventId} - qty: ${dto.quantity}`,
    );

    const result = await db.transaction(async (tx) => {
      const lockedEvent = await tx.execute(
        sql`SELECT * FROM events WHERE id = ${dto.eventId} FOR UPDATE`,
      );

      const eventRow = (
        lockedEvent as unknown as Array<Record<string, unknown>>
      )[0];

      if (!eventRow) {
        this.logger.warn(
          `Booking failed - event not found - eventId: ${dto.eventId}`,
        );
        throw new ResourceNotFoundException('Event', dto.eventId);
      }

      const totalTickets = eventRow['total_tickets'] as number;
      const bookedTickets = eventRow['booked_tickets'] as number;
      const remainingTickets = totalTickets - bookedTickets;

      if (remainingTickets < dto.quantity) {
        this.logger.warn(
          `Booking failed - sold out - eventId: ${dto.eventId} - remaining: ${remainingTickets} - requested: ${dto.quantity}`,
        );
        throw new InsufficientTicketsException(remainingTickets, dto.quantity);
      }

      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentBookingsResult = await tx.execute(
        sql`SELECT COUNT(*)::int as count FROM bookings WHERE event_id = ${dto.eventId} AND created_at >= ${windowStart}`,
      );
      const recentBookingsCount =
        ((
          recentBookingsResult as unknown as Array<Record<string, unknown>>
        )[0]?.['count'] as number) ?? 0;

      const priceBreakdown = this.pricingService.calculatePrice({
        eventId: dto.eventId,
        basePrice: parseFloat(eventRow['base_price'] as string),
        priceFloor: parseFloat(eventRow['price_floor'] as string),
        priceCeiling: parseFloat(eventRow['price_ceiling'] as string),
        eventDate: new Date(eventRow['date'] as string),
        totalTickets,
        bookedTickets,
        recentBookingsCount,
        pricingRules: eventRow['pricing_rules'] as PricingRulesConfig,
      });

      const pricePerTicket = priceBreakdown.finalPrice;
      const totalPrice = pricePerTicket * dto.quantity;
      const remainingAfterBooking = remainingTickets - dto.quantity;

      if (remainingAfterBooking <= totalTickets * 0.2) {
        this.logger.warn(
          `Low inventory - eventId: ${dto.eventId} - remaining: ${remainingAfterBooking}/${totalTickets}`,
        );
      }

      const insertedBooking = await tx
        .insert(bookings)
        .values({
          eventId: dto.eventId,
          userEmail: dto.userEmail,
          quantity: dto.quantity,
          pricePerTicket: pricePerTicket.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        })
        .returning();

      if (!insertedBooking[0]) {
        throw new InternalServerException('Failed to create booking');
      }

      await tx
        .update(events)
        .set({
          bookedTickets: bookedTickets + dto.quantity,
          currentPrice: pricePerTicket.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(events.id, dto.eventId));

      return {
        ...insertedBooking[0],
        eventName: eventRow['name'] as string,
      };
    });

    this.logger.log(
      `Booking confirmed - bookingId: ${result.id} - eventId: ${result.eventId} - ${maskedEmail} - total: ${result.totalPrice}`,
    );

    await this.cacheService.deleteMany([
      'events:all',
      `bookings:event:${result.eventId}`,
      `analytics:events:${result.eventId}`,
      'analytics:summary',
    ]);

    return {
      id: result.id,
      eventId: result.eventId,
      userEmail: result.userEmail,
      quantity: result.quantity,
      pricePerTicket: result.pricePerTicket,
      totalPrice: result.totalPrice,
      createdAt: result.createdAt,
      eventName: result.eventName,
    };
  }

  async findByEventId(eventId: string): Promise<BookingResponse[]> {
    const cacheKey = `bookings:event:${eventId}`;
    const cached = await this.cacheService.get<BookingResponse[]>(cacheKey);
    if (cached) return cached;

    const db = this.databaseService.db;

    const result = await db
      .select({
        id: bookings.id,
        eventId: bookings.eventId,
        userEmail: bookings.userEmail,
        quantity: bookings.quantity,
        pricePerTicket: bookings.pricePerTicket,
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt,
        eventName: events.name,
      })
      .from(bookings)
      .leftJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.eventId, eventId));

    const responses = result.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      userEmail: row.userEmail,
      quantity: row.quantity,
      pricePerTicket: row.pricePerTicket,
      totalPrice: row.totalPrice,
      createdAt: row.createdAt,
      eventName: row.eventName ?? undefined,
    }));

    await this.cacheService.set(cacheKey, responses, 30);
    return responses;
  }

  async findByUserEmail(email: string): Promise<BookingResponse[]> {
    const db = this.databaseService.db;

    const result = await db
      .select({
        id: bookings.id,
        eventId: bookings.eventId,
        userEmail: bookings.userEmail,
        quantity: bookings.quantity,
        pricePerTicket: bookings.pricePerTicket,
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt,
        eventName: events.name,
      })
      .from(bookings)
      .leftJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.userEmail, email));

    return result.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      userEmail: row.userEmail,
      quantity: row.quantity,
      pricePerTicket: row.pricePerTicket,
      totalPrice: row.totalPrice,
      createdAt: row.createdAt,
      eventName: row.eventName ?? undefined,
    }));
  }

  private maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');
    const [domainName = '', ...domainRest] = domain.split('.');
    const visibleLocal = localPart.slice(0, Math.min(4, localPart.length));
    const visibleDomain = domainName.slice(0, 1);
    const suffix = domainRest.length > 0 ? `.${domainRest.join('.')}` : '';

    return `${visibleLocal}***@${visibleDomain}***${suffix}`;
  }
}
