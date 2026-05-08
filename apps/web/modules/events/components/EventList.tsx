'use client';

import { EventCard } from './EventCard';
import { Loader } from '@/components/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { CalendarX } from 'lucide-react';
import type { Event } from '@/modules/events/types/events.types';

interface EventListProps {
  events: Event[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export function EventList({
  events,
  isLoading,
  isError,
  error,
  onRetry,
}: EventListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load events"
        message={error?.message || 'Unable to fetch events. Please try again.'}
        onRetry={onRetry}
      />
    );
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX className="w-8 h-8 text-gray-400" />}
        title="No events found"
        description="There are no upcoming events at the moment. Check back later for new events."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 gap-y-15">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
