import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ValidationException } from '../common/exceptions';

describe('BookingsController', () => {
  let controller: BookingsController;
  let mockBookingsService: any;

  beforeEach(() => {
    mockBookingsService = {
      createBooking: vi.fn(),
      findByEventId: vi.fn(),
      findByUserEmail: vi.fn(),
    };
    controller = new BookingsController(mockBookingsService);
  });

  describe('POST /bookings', () => {
    const validBody = {
      eventId: 'event-123',
      userEmail: 'user@test.com',
      quantity: 2,
    };

    it('creates a booking successfully', async () => {
      const mockBooking = {
        id: 'booking-1',
        eventId: 'event-123',
        userEmail: 'user@test.com',
        quantity: 2,
        pricePerTicket: '1200.00',
        totalPrice: '2400.00',
        createdAt: new Date(),
      };
      mockBookingsService.createBooking.mockResolvedValue(mockBooking);

      const result = await controller.create(validBody);

      expect(result).toEqual({
        success: true,
        data: mockBooking,
        message: 'Booking created successfully',
      });
    });

    it('passes the body to service', async () => {
      mockBookingsService.createBooking.mockResolvedValue({});
      await controller.create(validBody);
      expect(mockBookingsService.createBooking).toHaveBeenCalledWith(validBody);
    });
  });

  describe('GET /bookings', () => {
    it('returns bookings by eventId when eventId is provided', async () => {
      const mockBookings = [{ id: '1', eventId: 'event-123' }];
      mockBookingsService.findByEventId.mockResolvedValue(mockBookings);

      const result = await controller.find({ eventId: 'event-123' });

      expect(result).toEqual({
        success: true,
        data: mockBookings,
        count: 1,
      });
      expect(mockBookingsService.findByEventId).toHaveBeenCalledWith(
        'event-123',
      );
    });

    it('returns bookings by email when email is provided', async () => {
      const mockBookings = [{ id: '1', userEmail: 'user@test.com' }];
      mockBookingsService.findByUserEmail.mockResolvedValue(mockBookings);

      const result = await controller.find({ email: 'user@test.com' });

      expect(result).toEqual({
        success: true,
        data: mockBookings,
        count: 1,
      });
      expect(mockBookingsService.findByUserEmail).toHaveBeenCalledWith(
        'user@test.com',
      );
    });

    it('throws ValidationException when neither eventId nor email is provided', async () => {
      await expect(controller.find({})).rejects.toThrow(ValidationException);
    });

    it('throws ValidationException with correct message', async () => {
      await expect(controller.find({})).rejects.toThrow(
        'Please provide either eventId or email query parameter',
      );
    });

    it('prefers eventId over email when both are provided', async () => {
      mockBookingsService.findByEventId.mockResolvedValue([]);
      mockBookingsService.findByUserEmail.mockResolvedValue([]);

      await controller.find({
        eventId: 'event-123',
        email: 'user@test.com',
      });

      expect(mockBookingsService.findByEventId).toHaveBeenCalled();
      expect(mockBookingsService.findByUserEmail).not.toHaveBeenCalled();
    });

    it('returns empty bookings array', async () => {
      mockBookingsService.findByUserEmail.mockResolvedValue([]);

      const result = await controller.find({ email: 'nobody@test.com' });

      expect(result).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });
  });
});
