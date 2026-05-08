'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookingConfirmation } from '@/modules/bookings/components/BookingConfirmation';
import { useEvent } from '@/modules/events/hooks/useEvents';
import { useBookingStore } from '@/store/booking.store';
import { Loader } from '@/components/Loader';
import type { Booking } from '@/modules/bookings/types/bookings.types';

export default function BookingSuccessPage() {
  const router = useRouter();
  const lastBooking = useBookingStore((state) => state.lastBooking);
  const { data: event, isLoading } = useEvent(lastBooking?.eventId ?? '');

  useEffect(() => {
    if (!lastBooking) {
      router.replace('/events');
    }
  }, [lastBooking, router]);

  if (!lastBooking || isLoading || !event) {
    return (
      <div className="mx-auto max-w-2xl flex items-center justify-center min-h-[60vh] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Loader />
      </div>
    );
  }

  const booking: Booking = {
    id: lastBooking.id,
    eventId: lastBooking.eventId,
    userEmail: lastBooking.userEmail,
    quantity: lastBooking.quantity,
    pricePerTicket: lastBooking.pricePerTicket.toFixed(2),
    totalPrice: lastBooking.totalPrice.toFixed(2),
    createdAt: lastBooking.createdAt,
    eventName: lastBooking.eventName,
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <BookingConfirmation booking={booking} event={event} />
    </div>
  );
}
