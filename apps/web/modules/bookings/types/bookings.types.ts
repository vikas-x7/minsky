import type { Event } from '@/modules/events/types/events.types';

export interface Booking {
  id: string;
  eventId: string;
  userEmail: string;
  quantity: number;
  pricePerTicket: string;
  totalPrice: string;
  createdAt: string;
  eventName?: string;
  event?: Event;
}

export interface BookingFormData {
  eventId: string;
  userEmail: string;
  quantity: number;
}

export interface StoredBooking {
  id: string;
  eventId: string;
  eventName: string;
  userEmail: string;
  quantity: number;
  pricePerTicket: number;
  totalPrice: number;
  createdAt: string;
}
