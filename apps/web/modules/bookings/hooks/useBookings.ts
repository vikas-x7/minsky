'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  fetchBookingsByEmail,
} from '@/modules/bookings/api/bookings.api';
import type { BookingFormData } from '@/modules/bookings/types/bookings.types';

export function useBookingsByEmail(email: string) {
  return useQuery({
    queryKey: ['bookings', 'email', email],
    queryFn: () => fetchBookingsByEmail(email),
    enabled: Boolean(email),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BookingFormData) => createBooking(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({
        queryKey: ['event', variables.eventId, 'price'],
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
