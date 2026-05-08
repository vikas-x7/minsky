import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/lib/types';
import type {
  Booking,
  BookingFormData,
} from '@/modules/bookings/types/bookings.types';

export async function createBooking(data: BookingFormData): Promise<Booking> {
  const response = await apiClient.post<ApiResponse<Booking>>(
    '/bookings',
    data,
  );
  return response.data.data;
}

export async function fetchBookingsByEmail(email: string): Promise<Booking[]> {
  const response = await apiClient.get<ApiResponse<Booking[]>>(
    `/bookings?email=${encodeURIComponent(email)}`,
  );
  return response.data.data;
}
