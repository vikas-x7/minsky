import { Controller, Get, Post, Body, Query, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { ValidationException } from '../common/exceptions';

@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject(BookingsService)
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() body: CreateBookingDto) {
    const booking = await this.bookingsService.createBooking(body);
    return {
      success: true,
      data: booking,
      message: 'Booking created successfully',
    };
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async find(@Query() query: QueryBookingsDto) {
    if (!query.eventId && !query.email) {
      throw new ValidationException(
        'Please provide either eventId or email query parameter',
      );
    }

    if (query.eventId) {
      const bookings = await this.bookingsService.findByEventId(query.eventId);
      return {
        success: true,
        data: bookings,
        count: bookings.length,
      };
    }

    const bookings = await this.bookingsService.findByUserEmail(query.email!);
    return {
      success: true,
      data: bookings,
      count: bookings.length,
    };
  }
}
