export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const POLLING_INTERVAL = 30000; // 30 seconds

export const DEFAULT_PRICING_RULES = {
  timeBasedRule: {
    enabled: true,
    weight: 0.4,
    thresholds: [
      { daysBeforeEvent: 30, adjustment: 0 },
      { daysBeforeEvent: 7, adjustment: 0.2 },
      { daysBeforeEvent: 1, adjustment: 0.5 },
    ],
  },
  demandBasedRule: {
    enabled: true,
    weight: 0.3,
    bookingsThreshold: 10,
    timeWindowMinutes: 60,
    adjustment: 0.15,
  },
  inventoryBasedRule: {
    enabled: true,
    weight: 0.3,
    thresholds: [
      { remainingPercentage: 50, adjustment: 0.1 },
      { remainingPercentage: 20, adjustment: 0.25 },
      { remainingPercentage: 10, adjustment: 0.4 },
    ],
  },
};

export const ROUTES = {
  HOME: '/',
  EVENTS: '/events',
  EVENT_DETAIL: (id: string) => `/events/${id}`,
  BOOKING_SUCCESS: '/bookings/success',
  MY_BOOKINGS: '/my-bookings',
} as const;
