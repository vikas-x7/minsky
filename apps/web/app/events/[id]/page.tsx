import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  PieChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { BookingForm } from '@/modules/bookings/components/BookingForm';
import { PriceBreakdown } from '@/modules/events/components/PriceBreakdown';
import { getEventFromDb } from '@/modules/events/api/events.server';
import { PriceDisplay } from '@/modules/pricing/components/PriceDisplay';
import {
  formatCurrency,
  formatDateTime,
  formatRelativeDate,
  getAvailabilityStatus,
  getDaysUntilEvent,
} from '@/lib/utils/format';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params;
  const event = await getEventFromDb(id);

  if (!event) {
    notFound();
  }

  const availability = getAvailabilityStatus(
    event.totalTickets,
    event.bookedTickets,
  );
  const occupancy = Math.round(
    (event.bookedTickets / event.totalTickets) * 100,
  );
  const daysUntil = getDaysUntilEvent(event.date);
  const priceDiff = event.currentPrice - event.basePrice;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 sm:pt-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-medium  text-black -tracking-[1px] sm:text-3xl lg:text-3xl">
                {event.name}
              </h1>
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDateTime(event.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatRelativeDate(event.date)}
              </span>
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Current Price
            </p>
            <div className="mt-1 flex items-baseline gap-2 lg:justify-end">
              <span className="text-3xl font-medium text-gray-900">
                {formatCurrency(event.currentPrice)}
              </span>
              {priceDiff > 0 && (
                <span className="flex items-center gap-0.5 text-sm font-medium text-amber-600">
                  <TrendingUp className="h-3.5 w-3.5" />+
                  {formatCurrency(priceDiff)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 py-8 sm:pb-10 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium  text-black -tracking-[0.5px]">
                About This Event
              </h2>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line leading-relaxed  font-medium  text-black/80 -tracking-[0.5px]">
                {event.description || 'No description available.'}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="py-5 text-center">
                <Users className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                <p className="text-xl font-bold text-gray-900">
                  {event.totalTickets.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Total Capacity</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <TrendingUp className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                <p className="text-xl font-bold text-gray-900">
                  {event.bookedTickets.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Tickets Sold</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <Clock className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                <p className="text-xl font-bold text-gray-900">
                  {daysUntil > 0 ? daysUntil : 0}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Days to Event</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <PieChart className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                <p className="text-xl font-bold text-gray-900">{occupancy}%</p>
                <p className="mt-0.5 text-xs text-gray-500">Occupancy</p>
              </CardContent>
            </Card>
          </div>

          {event.priceBreakdown && (
            <PriceBreakdown breakdown={event.priceBreakdown} />
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-1">
          <PriceDisplay
            eventId={event.id}
            initialPrice={event.currentPrice}
            basePrice={event.basePrice}
          />
          <BookingForm key={event.id} event={event} />
        </div>
      </div>
    </div>
  );
}
