// page.tsx

import { HeroSlider } from '@/components/layout/HeroSlider';
import { getEventsFromDb } from '@/modules/events/api/events.server';
import { EventList } from '@/modules/events/components/EventList';

export default async function EventsPage() {
  const events = await getEventsFromDb();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <HeroSlider />

      <div className="py-10">
        <EventList
          events={events}
          isLoading={false}
          isError={false}
          error={null}
        />
      </div>
    </div>
  );
}
