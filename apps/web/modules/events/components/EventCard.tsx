'use client';

import Link from 'next/link';
import { Calendar, MapPin, TrendingUp, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getAvailabilityStatus,
} from '@/lib/utils/format';
import type { Event } from '@/modules/events/types/events.types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const availability = getAvailabilityStatus(
    event.totalTickets,
    event.bookedTickets,
  );
  const remaining = event.totalTickets - event.bookedTickets;
  const occupancy = Math.round(
    (event.bookedTickets / event.totalTickets) * 100,
  );
  const basePriceNum =
    typeof event.basePrice === 'string'
      ? parseFloat(event.basePrice)
      : event.basePrice;
  const priceDiff = event.currentPrice - basePriceNum;
  const hasSurge = priceDiff > 0;

  return (
    <Card hover className="flex flex-col group p-2">
      <div className="flex flex-1 flex-col p-5 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg text-black font-medium -tracking-[1px] group-hover:text-black transition-colors line-clamp-2 leading-snug">
              {event.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-black/70">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>
          <Badge
            variant={
              availability.urgency === 'high'
                ? 'danger'
                : availability.urgency === 'medium'
                  ? 'warning'
                  : 'success'
            }
          >
            {availability.label}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
          {event.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formatRelativeDate(event.date)}</span>
          </div>
        </div>

        <div className="mb-4 mt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
                Current Price
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font- text-black">
                  {formatCurrency(event.currentPrice)}
                </span>
                {hasSurge && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                    <TrendingUp className="w-3 h-3" />+
                    {formatCurrency(priceDiff)}
                  </span>
                )}
              </div>
              {hasSurge && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Base: {formatCurrency(basePriceNum)}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${occupancy >= 80 ? 'bg-red-500' : occupancy >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {remaining}/{event.totalTickets} left
              </p>
            </div>
          </div>
        </div>

        <Link href={`/events/${event.id}`} className="block">
          <Button
            variant={remaining === 0 ? 'secondary' : 'primary'}
            size="md"
            className="w-full text-black outline-none"
            disabled={remaining === 0}
          >
            {remaining === 0 ? 'Sold Out' : 'View Details & Book'}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
