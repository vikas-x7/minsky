import { Suspense } from 'react';
import { Ticket } from 'lucide-react';
import { getBookingsByEmailFromDb } from '@/modules/bookings/api/bookings.server';
import { BookingsList } from '@/modules/bookings/components/BookingsList';
import { EmailSearch } from './components/EmailSearch';
import { Loader } from '@/components/Loader';

async function BookingsResults({ email }: { email: string }) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-e flex h-16 w-16 items-center justify-center ">
          <Ticket className="h-8 w-8 text-black" />
        </div>
        <h3 className="mb-2 text-lg font-semibold -tracking-[0.5px] text-black">
          Enter your email
        </h3>
        <p className="max-w-sm text-black/70">
          Enter the email address you used when booking to view your tickets.
        </p>
      </div>
    );
  }

  const bookings = await getBookingsByEmailFromDb(email);

  return (
    <>
      <p className="mb-6 text-sm text-gray-500">
        Showing bookings for{' '}
        <span className="font-medium text-gray-900">{email}</span>
      </p>
      <BookingsList
        bookings={bookings}
        isLoading={false}
        isError={false}
        error={null}
      />
    </>
  );
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params?.email?.trim() ?? '';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="border-b border-gray-200 py-4 sm:py-7 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-medium -tracking-[1px] text-gray-900 sm:text-3xl">
            My Bookings
          </h1>

          <p className="mt-2 text-base text-black/70 -tracking-[0.5px]">
            Look up your bookings by email address.
          </p>
        </div>

        <div className="w-full md:w-auto">
          <EmailSearch defaultEmail={email} />
        </div>
      </div>

      <div className="py-8 sm:py-12">
        <Suspense
          key={email}
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader />
            </div>
          }
        >
          <BookingsResults email={email} />
        </Suspense>
      </div>
    </div>
  );
}
