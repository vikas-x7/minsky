export interface PricingRules {
  timeBasedRule: {
    enabled: boolean;
    weight: number;
    thresholds: Array<{
      daysBeforeEvent: number;
      adjustment: number;
    }>;
  };
  demandBasedRule: {
    enabled: boolean;
    weight: number;
    bookingsThreshold: number;
    timeWindowMinutes: number;
    adjustment: number;
  };
  inventoryBasedRule: {
    enabled: boolean;
    weight: number;
    thresholds: Array<{
      remainingPercentage: number;
      adjustment: number;
    }>;
  };
}

export interface EventAnalytics {
  eventId: string;
  eventName: string;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
  remainingTickets: number;
  occupancyRate: number;
}

export interface SystemAnalytics {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalTicketsSold: number;
  averageOccupancyRate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
}

export interface CreateEventData {
  name: string;
  date: string;
  venue: string;
  description: string;
  totalTickets: number;
  basePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  pricingRules: PricingRules;
}
