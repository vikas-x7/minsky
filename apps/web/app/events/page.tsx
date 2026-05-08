import { getEventsFromDb } from '@/modules/events/api/events.server';
import { EventList } from '@/modules/events/components/EventList';

export default async function EventsPage() {
  const events = await getEventsFromDb();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <img
        src="https://i.pinimg.com/1200x/e6/fd/50/e6fd50a28424e6188778bdcc47baf7f8.jpg"
        alt=""
        className="h-56 w-full object-cover sm:h-72"
      />

      <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"></div>

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
