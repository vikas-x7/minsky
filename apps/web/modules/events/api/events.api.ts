import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/lib/types';
import type { Event, PriceSnapshot } from '@/modules/events/types/events.types';

function normalizeEvent(event: Event): Event {
  return {
    ...event,
    date: new Date(event.date).toISOString(),
    createdAt: new Date(event.createdAt).toISOString(),
    updatedAt: new Date(event.updatedAt).toISOString(),
    basePrice: Number(event.basePrice),
    currentPrice: Number(event.currentPrice),
    priceFloor: Number(event.priceFloor),
    priceCeiling: Number(event.priceCeiling),
    remainingTickets:
      event.remainingTickets ?? event.totalTickets - event.bookedTickets,
  };
}

export async function fetchEvents(): Promise<Event[]> {
  const response = await apiClient.get<ApiResponse<Event[]>>('/events');
  return response.data.data.map(normalizeEvent);
}

export async function fetchEventById(id: string): Promise<Event> {
  const response = await apiClient.get<ApiResponse<Event>>(`/events/${id}`);
  return normalizeEvent(response.data.data);
}

export async function fetchEventPrice(id: string): Promise<PriceSnapshot> {
  const event = await fetchEventById(id);

  return {
    eventId: event.id,
    currentPrice: event.currentPrice,
    basePrice: event.basePrice,
    remainingTickets: event.remainingTickets,
    updatedAt: event.updatedAt,
  };
}
