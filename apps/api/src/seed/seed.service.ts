import { Injectable, Inject, OnApplicationBootstrap } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { events, bookings, type PricingRulesConfig } from '@repo/database';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {}

  async onApplicationBootstrap() {
    const db = this.databaseService.db;
    const existing = await db.select().from(events).limit(1);
    if (existing.length === 0) {
      console.log('No events found. Seeding database...');
      const result = await this.seed();
      console.log(`Database seeded: ${result.eventsCreated} events created.`);
    }
  }

  async seed(): Promise<{ eventsCreated: number; message: string }> {
    const db = this.databaseService.db;

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

    const sampleEvents = [
      {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        name: 'TechConf 2026 - Future of AI',
        description:
          'Join the biggest AI conference in India featuring keynotes from leading researchers, hands-on workshops, and networking sessions.',
        date: new Date('2026-06-15T09:00:00Z'),
        venue: 'Bangalore International Exhibition Centre, Bangalore',
        totalTickets: 500,
        bookedTickets: 120,
        basePrice: '2999.00',
        currentPrice: '2999.00',
        priceFloor: '1999.00',
        priceCeiling: '5999.00',
        pricingRules: defaultPricingRules,
      },
      {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        name: 'Indie Music Festival 2026',
        description:
          'A two-day celebration of independent music featuring 30+ artists across 3 stages.',
        date: new Date('2026-05-20T16:00:00Z'),
        venue: 'Sunset Arena, Mumbai',
        totalTickets: 2000,
        bookedTickets: 1650,
        basePrice: '1499.00',
        currentPrice: '1499.00',
        priceFloor: '999.00',
        priceCeiling: '3499.00',
        pricingRules: defaultPricingRules,
      },
      {
        id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        name: 'Startup Summit Delhi',
        description:
          "Connect with 200+ startups, 50+ investors, and industry leaders at India's premier startup event.",
        date: new Date('2026-05-10T10:00:00Z'),
        venue: 'India Habitat Centre, New Delhi',
        totalTickets: 300,
        bookedTickets: 280,
        basePrice: '4999.00',
        currentPrice: '4999.00',
        priceFloor: '3999.00',
        priceCeiling: '9999.00',
        pricingRules: defaultPricingRules,
      },
      {
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
        name: 'Comedy Night Special',
        description:
          "An evening of non-stop laughs featuring India's top stand-up comedians.",
        date: new Date('2026-07-25T19:00:00Z'),
        venue: 'Canvas Laugh Club, Mumbai',
        totalTickets: 200,
        bookedTickets: 30,
        basePrice: '799.00',
        currentPrice: '799.00',
        priceFloor: '499.00',
        priceCeiling: '1999.00',
        pricingRules: defaultPricingRules,
      },
      {
        id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
        name: 'Web3 & Blockchain Hackathon',
        description:
          '48-hour hackathon focused on building decentralized applications. Prizes worth ₹10L.',
        date: new Date('2026-08-05T08:00:00Z'),
        venue: 'T-Hub, Hyderabad',
        totalTickets: 150,
        bookedTickets: 0,
        basePrice: '999.00',
        currentPrice: '999.00',
        priceFloor: '499.00',
        priceCeiling: '2499.00',
        pricingRules: defaultPricingRules,
      },
      {
        id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
        name: 'Classical Music Evening - Pt. Ravishankar Tribute',
        description:
          'A mesmerizing evening of Indian classical music paying tribute to the legendary Pt. Ravi Shankar.',
        date: new Date('2026-05-07T18:30:00Z'),
        venue: 'Chowdiah Memorial Hall, Bangalore',
        totalTickets: 400,
        bookedTickets: 395,
        basePrice: '1299.00',
        currentPrice: '1299.00',
        priceFloor: '799.00',
        priceCeiling: '2999.00',
        pricingRules: defaultPricingRules,
      },
    ];

    // Clear existing data (bookings first due to FK constraint)
    await db.delete(bookings);
    await db.delete(events);

    // Insert sample events
    const inserted = await db.insert(events).values(sampleEvents).returning();

    return {
      eventsCreated: inserted.length,
      message: `Successfully seeded ${inserted.length} sample events`,
    };
  }
}
