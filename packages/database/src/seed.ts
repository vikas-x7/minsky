import { createDb } from './index.js';
import { events, type PricingRulesConfig } from './schema.js';
import { sql } from 'drizzle-orm';

async function seed() {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error(' DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const { db, client } = createDb(databaseUrl);

  console.log(' Seeding database...');

  // Default pricing rules configuration
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
        'Join the biggest AI conference in India featuring keynotes from leading researchers, hands-on workshops, and networking sessions. Topics include LLMs, computer vision, robotics, and AI ethics.',
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
        'A two-day celebration of independent music featuring 30+ artists across 3 stages. Genres include indie rock, electronic, folk, and hip-hop. Food trucks, art installations, and camping available.',
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
      id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
      name: 'Startup Summit Delhi',
      description:
        "Connect with 200+ startups, 50+ investors, and industry leaders at India's premier startup event. Pitch competitions, mentorship sessions, and exclusive fundraising workshops.",
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
      id: 'd4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f8a',
      name: 'Comedy Night Special',
      description:
        "An evening of non-stop laughs featuring India's top stand-up comedians. Enjoy 4 hours of back-to-back sets, audience interactions, and surprise celebrity appearances.",
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
      id: 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b',
      name: 'Web3 & Blockchain Hackathon',
      description:
        '48-hour hackathon focused on building decentralized applications. Prizes worth ₹10L, mentorship from industry experts, and recruitment opportunities from top Web3 companies.',
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
      id: 'f6a7b8c9-d0e1-4f2a-bb4c-5d6e7f8a9b0c',
      name: 'Classical Music Evening with Pt. Ravishankar Tribute',
      description:
        'A mesmerizing evening of Indian classical music paying tribute to the legendary Pt. Ravi Shankar. Featuring sitar, tabla, and flute performances by acclaimed artists.',
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

    {
      id: 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d',
      name: 'Yoga & Wellness Retreat 2026',
      description:
        'A rejuvenating weekend retreat with expert yoga instructors, guided meditation sessions, Ayurvedic nutrition workshops, and sound healing experiences. Perfect for beginners and advanced practitioners.',
      date: new Date('2026-09-12T06:30:00Z'),
      venue: 'Rishikesh Yoga Ashram, Rishikesh',
      totalTickets: 100,
      bookedTickets: 45,
      basePrice: '3499.00',
      currentPrice: '3499.00',
      priceFloor: '2499.00',
      priceCeiling: '5999.00',
      pricingRules: defaultPricingRules,
    },
    {
      id: 'b8c9d0e1-f2a3-4b4c-9d5e-6f7a8b9c0d1e',
      name: 'National Photography Exhibition',
      description:
        'Showcase your work alongside 100+ photographers from across India. Categories include wildlife, street photography, portrait, and abstract. Live judging, masterclasses, and gear expo included.',
      date: new Date('2026-10-18T10:00:00Z'),
      venue: 'National Gallery of Modern Art, New Delhi',
      totalTickets: 600,
      bookedTickets: 210,
      basePrice: '599.00',
      currentPrice: '599.00',
      priceFloor: '299.00',
      priceCeiling: '1499.00',
      pricingRules: defaultPricingRules,
    },
    {
      id: 'c9d0e1f2-a3b4-4c5d-ae6f-7a8b9c0d1e2f',
      name: 'Food & Culinary Arts Festival',
      description:
        'A gastronomic celebration featuring celebrity chefs, live cooking battles, regional cuisine showcases, and interactive cooking classes. 200+ food stalls spanning Indian, Asian, and Continental cuisines.',
      date: new Date('2026-11-08T11:00:00Z'),
      venue: 'MMRDA Grounds, Mumbai',
      totalTickets: 5000,
      bookedTickets: 1200,
      basePrice: '499.00',
      currentPrice: '499.00',
      priceFloor: '299.00',
      priceCeiling: '1299.00',
      pricingRules: defaultPricingRules,
    },
    {
      id: 'd0e1f2a3-b4c5-4d6e-bf7a-8b9c0d1e2f3a',
      name: 'Cybersecurity Summit Pune 2026',
      description:
        "India's leading cybersecurity conference with CTF competitions, red team vs blue team exercises, and talks on zero-day exploits, cloud security, and ethical hacking. CEH and CISSP workshops available.",
      date: new Date('2026-09-25T09:00:00Z'),
      venue: 'Pune International Convention Centre, Pune',
      totalTickets: 400,
      bookedTickets: 340,
      basePrice: '3999.00',
      currentPrice: '3999.00',
      priceFloor: '2999.00',
      priceCeiling: '7999.00',
      pricingRules: defaultPricingRules,
    },
    {
      id: 'e1f2a3b4-c5d6-4e7f-c08b-9c0d1e2f3a4b',
      name: 'Bollywood Night Live',
      description:
        'An electrifying live concert featuring chart-topping Bollywood playback singers performing their greatest hits. Laser light shows, live orchestra, and special dance acts make this a night to remember.',
      date: new Date('2026-12-20T19:30:00Z'),
      venue: 'DY Patil Stadium, Mumbai',
      totalTickets: 15000,
      bookedTickets: 8500,
      basePrice: '1999.00',
      currentPrice: '1999.00',
      priceFloor: '999.00',
      priceCeiling: '8999.00',
      pricingRules: defaultPricingRules,
    },
    {
      id: 'f2a3b4c5-d6e7-4f8a-d19c-0d1e2f3a4b5c',
      name: 'EV & Green Tech Expo 2026',
      description:
        "Explore the future of sustainable mobility at India's biggest electric vehicle and green technology expo. Test drives, battery tech showcases, solar energy demos, and panel discussions with policymakers.",
      date: new Date('2026-10-03T09:30:00Z'),
      venue: 'Bharat Mandapam, New Delhi',
      totalTickets: 3000,
      bookedTickets: 480,
      basePrice: '799.00',
      currentPrice: '799.00',
      priceFloor: '499.00',
      priceCeiling: '2499.00',
      pricingRules: defaultPricingRules,
    },
  ];

  try {
    const existingEvents = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events);
    const existingCount = existingEvents[0]?.count ?? 0;
    const forceSeed = process.env['SEED_FORCE'] === 'true';

    if (existingCount > 0 && !forceSeed) {
      console.log(
        ` Found ${existingCount} existing events. Skipping seed. Set SEED_FORCE=true to reseed.`,
      );
      return;
    }

    if (forceSeed) {
      await db.delete(events);
    }

    const inserted = await db.insert(events).values(sampleEvents).returning();

    console.log(` Inserted ${inserted.length} events:`);
    for (const event of inserted) {
      const remaining = event.totalTickets - event.bookedTickets;
      const percentSold = (
        (event.bookedTickets / event.totalTickets) *
        100
      ).toFixed(1);
      console.log(
        `    ${event.name} | ₹${event.basePrice} | ${remaining}/${event.totalTickets} remaining (${percentSold}% sold)`,
      );
    }

    console.log('\n Seeding complete!');
  } catch (error) {
    console.error(' Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
