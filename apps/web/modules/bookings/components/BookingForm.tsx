'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBookingStore } from '@/store/booking.store';
import { useCreateBooking } from '@/modules/bookings/hooks/useBookings';
import {
  bookingFormSchema,
  type BookingFormValues,
} from '@/modules/bookings/schemas/bookings.schema';
import { formatCurrency } from '@/lib/utils/format';
import type { Event } from '@/modules/events/types/events.types';

interface BookingFormProps {
  event: Event;
}

export function BookingForm({ event }: BookingFormProps) {
  const router = useRouter();
  const { quantity, userEmail, setQuantity, setUserEmail, setLastBooking } =
    useBookingStore();
  const createBookingMutation = useCreateBooking();

  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<BookingFormValues>({
    defaultValues: {
      eventId: event.id,
      userEmail,
      quantity,
    },
  });

  const remaining = event.totalTickets - event.bookedTickets;
  const maxQuantity = Math.min(remaining, 10);
  const totalPrice = event.currentPrice * quantity;

  const handleQuantityChange = useCallback(
    (delta: number) => {
      const newQuantity = quantity + delta;
      if (newQuantity >= 1 && newQuantity <= maxQuantity) {
        setQuantity(newQuantity);
        setValue('quantity', newQuantity, { shouldValidate: true });
      }
    },
    [quantity, maxQuantity, setQuantity, setValue],
  );

  const onSubmit = async (values: BookingFormValues) => {
    setServerError(null);

    const result = bookingFormSchema.safeParse(values);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === 'string') {
          setError(field as keyof BookingFormValues, {
            type: 'manual',
            message: issue.message,
          });
        }
      });
      return;
    }

    try {
      const booking = await createBookingMutation.mutateAsync(result.data);
      setLastBooking({
        id: booking.id,
        eventId: event.id,
        eventName: booking.eventName || event.name,
        userEmail: booking.userEmail,
        quantity: booking.quantity,
        pricePerTicket: Number(booking.pricePerTicket),
        totalPrice: Number(booking.totalPrice),
        createdAt: new Date(booking.createdAt).toISOString(),
      });
      router.push('/bookings/success');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setServerError(
        errorObj?.message || 'Failed to complete booking. Please try again.',
      );
    }
  };

  if (remaining === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sold Out</h3>
          <p className="text-sm text-gray-500">
            All tickets for this event have been booked.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold -tracking-[1px] text-gray-900">
          Book Tickets
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {remaining} ticket{remaining !== 1 ? 's' : ''} remaining
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <input type="hidden" {...register('eventId')} value={event.id} />
          <input
            type="hidden"
            {...register('quantity', { valueAsNumber: true })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            value={userEmail}
            {...register('userEmail', {
              onChange: (e) => setUserEmail(e.target.value),
            })}
            error={errors.userEmail?.message}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-lg font-semibold text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= maxQuantity}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.quantity?.message && (
              <p className="text-sm text-red-600">{errors.quantity.message}</p>
            )}
            <p className="text-xs text-gray-400">Max {maxQuantity} tickets</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-600">
                {formatCurrency(event.currentPrice)} × {quantity}
              </span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-right text-lg font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {serverError && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 border border-red-100">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={createBookingMutation.isPending}
          >
            Confirm Booking · {formatCurrency(totalPrice)}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Price may change. The price shown at time of booking is final.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
