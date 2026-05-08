import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Inject,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UnauthorizedException } from '../common/exceptions';

const ADMIN_API_KEY = process.env['ADMIN_API_KEY'] || 'admin-secret-key';

@Controller('events')
export class EventsController {
  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  async findAll() {
    const events = await this.eventsService.findAll();
    return {
      success: true,
      data: events,
      count: events.length,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const event = await this.eventsService.findOne(id);
    return {
      success: true,
      data: event,
    };
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(
    @Body() body: CreateEventDto,
    @Headers('x-api-key') apiKey: string | undefined,
  ) {
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
      throw new UnauthorizedException(
        'Invalid or missing API key. Set the x-api-key header to access this endpoint.',
      );
    }

    const event = await this.eventsService.create(body);
    return {
      success: true,
      data: event,
      message: 'Event created successfully',
    };
  }
}
