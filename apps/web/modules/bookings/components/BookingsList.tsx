'use client';

import Link from 'next/link';
import {
  Calendar,
  Ticket as TicketIcon,
  TrendingDown,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader } from '@/components/Loader';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Booking } from '@/modules/bookings/types/bookings.types';

interface BookingsListProps {
  bookings: Booking[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export function BookingsList({
  bookings,
  isLoading,
  isError,
  error,
  onRetry,
}: BookingsListProps) {
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    );

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load bookings"
        message={error?.message || 'Unable to fetch your bookings.'}
        onRetry={onRetry}
      />
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        icon={<TicketIcon className="w-8 h-8 text-gray-400" />}
        title="No bookings found"
        description="You haven't booked any tickets yet, or the email address doesn't match any bookings."
      />
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const pricePaid = parseFloat(booking.pricePerTicket);
        const currentPrice = booking.event?.currentPrice ?? pricePaid;
        const priceDiff = currentPrice - pricePaid;
        const savedMoney = priceDiff > 0;
        const priceDiffTotal = priceDiff * booking.quantity;

        return (
          <Card key={booking.id} className="overflow-hidden">
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TicketIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {booking.eventName ||
                          booking.event?.name ||
                          `Event #${booking.eventId}`}
                      </h3>
                      {booking.event?.date && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{formatDateTime(booking.event.date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Badge variant="default">
                      {booking.quantity} ticket
                      {booking.quantity !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(pricePaid)} each
                    </span>
                  </div>
                </div>

                <div className="sm:text-right sm:flex-shrink-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Total Paid
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">
                    {formatCurrency(parseFloat(booking.totalPrice))}
                  </p>
                  {priceDiff !== 0 && (
                    <div className="mt-2">
                      <Badge variant={savedMoney ? 'success' : 'info'}>
                        {savedMoney ? (
                          <span className="flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            <span>Saved {formatCurrency(priceDiffTotal)}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            <span>
                              Now {formatCurrency(Math.abs(priceDiffTotal))}{' '}
                              less
                            </span>
                          </span>
                        )}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center mt-4 pt-4 border-t border-gray-100 gap-2">
                <p className="text-xs text-gray-400">
                  Booked on {formatDateTime(booking.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
