'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Ticket,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Booking } from '@/modules/bookings/types/bookings.types';
import type { Event } from '@/modules/events/types/events.types';

interface BookingConfirmationProps {
  booking: Booking;
  event: Event;
}

export function BookingConfirmation({
  booking,
  event,
}: BookingConfirmationProps) {
  const pricePaid = parseFloat(booking.pricePerTicket);
  const priceDiff = event.currentPrice - pricePaid;
  const savedMoney = priceDiff > 0;
  const priceDiffTotal = priceDiff * booking.quantity;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto  rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 " />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Booking Confirmed!
          </h1>
          <p className="text-gray-500 mt-1">
            Your tickets have been reserved successfully.
          </p>
        </div>
      </div>

      {/* Event Details */}
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 leading-snug">
              {event.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>{formatDateTime(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Ticket className="w-4 h-4" /> Tickets
              </span>
              <span className="font-medium text-gray-900">
                {booking.quantity}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-600">Price per ticket</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(pricePaid)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-900">Total Paid</span>
              <span className="text-right text-lg font-bold text-gray-900">
                {formatCurrency(parseFloat(booking.totalPrice))}
              </span>
            </div>
          </div>

          {/* Price Comparison */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Current Price
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatCurrency(event.currentPrice)}
                </p>
              </div>
              {priceDiff !== 0 && (
                <Badge variant={savedMoney ? 'success' : 'info'}>
                  {savedMoney ? (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>You saved {formatCurrency(priceDiffTotal)}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        Price dropped {formatCurrency(Math.abs(priceDiffTotal))}
                      </span>
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* Booking ID */}
          <div className="text-center">
            <p className="text-xs text-gray-400">Booking ID: {booking.id}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Confirmation sent to {booking.userEmail}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/events" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">
            Browse More Events
          </Button>
        </Link>
        <Link href="/my-bookings" className="flex-1">
          <Button variant="primary" size="lg" className="w-full">
            My Bookings <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
