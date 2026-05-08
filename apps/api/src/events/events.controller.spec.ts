import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { UnauthorizedException } from '../common/exceptions';

describe('EventsController', () => {
  let controller: EventsController;
  let mockEventsService: any;

  beforeEach(() => {
    mockEventsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    };
    controller = new EventsController(mockEventsService);
  });

  describe('GET /events', () => {
    it('returns all events', async () => {
      const mockEvents = [
        { id: '1', name: 'Event 1', currentPrice: 100 },
        { id: '2', name: 'Event 2', currentPrice: 200 },
      ];
      mockEventsService.findAll.mockResolvedValue(mockEvents);

      const result = await controller.findAll();

      expect(result).toEqual({
        success: true,
        data: mockEvents,
        count: 2,
      });
    });

    it('returns empty array when no events', async () => {
      mockEventsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });
  });

  describe('GET /events/:id', () => {
    it('returns a single event', async () => {
      const mockEvent = { id: '1', name: 'Event 1' };
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      const result = await controller.findOne('1');

      expect(result).toEqual({
        success: true,
        data: mockEvent,
      });
    });

    it('passes the correct id to service', async () => {
      mockEventsService.findOne.mockResolvedValue({});
      await controller.findOne('test-id-123');
      expect(mockEventsService.findOne).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('POST /events', () => {
    const validBody = {
      name: 'New Event',
      date: '2026-12-31T23:59:59Z',
      venue: 'Venue',
      totalTickets: 100,
      basePrice: 1000,
    };

    it('creates an event with valid API key', async () => {
      const mockCreated = { id: '1', name: 'New Event' };
      mockEventsService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(
        validBody as any,
        'admin-secret-key',
      );

      expect(result).toEqual({
        success: true,
        data: mockCreated,
        message: 'Event created successfully',
      });
    });

    it('throws UnauthorizedException when API key is missing', async () => {
      await expect(
        controller.create(validBody as any, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when API key is wrong', async () => {
      await expect(
        controller.create(validBody as any, 'wrong-key'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when API key is empty string', async () => {
      await expect(controller.create(validBody as any, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('passes body to service when API key is valid', async () => {
      mockEventsService.create.mockResolvedValue({});

      await controller.create(validBody as any, 'admin-secret-key');

      expect(mockEventsService.create).toHaveBeenCalledWith(validBody);
    });
  });
});
