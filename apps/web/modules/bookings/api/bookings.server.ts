import { getDb } from '@/lib/db';
import type { Booking } from '@/modules/bookings/types/bookings.types';

interface BookingRow {
  id: string;
  event_id: string;
  user_email: string;
  quantity: number;
  price_per_ticket: string;
  total_price: string;
  created_at: Date | string;
  event_name: string | null;
  event_date: Date | string | null;
  event_venue: string | null;
  event_current_price: string | null;
  event_base_price: string | null;
  event_price_floor: string | null;
  event_price_ceiling: string | null;
  event_total_tickets: number | null;
  event_booked_tickets: number | null;
}

type SqlQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<BookingRow[]>;

export async function getBookingsByEmailFromDb(
  email: string,
): Promise<Booking[]> {
  const query = getDb().client as unknown as SqlQuery;
  const rows = await query`
    select
      b.id,
      b.event_id,
      b.user_email,
      b.quantity,
      b.price_per_ticket,
      b.total_price,
      b.created_at,
      e.name as event_name,
      e.date as event_date,
      e.venue as event_venue,
      e.current_price as event_current_price,
      e.base_price as event_base_price,
      e.price_floor as event_price_floor,
      e.price_ceiling as event_price_ceiling,
      e.total_tickets as event_total_tickets,
      e.booked_tickets as event_booked_tickets
    from bookings b
    left join events e on b.event_id = e.id
    where b.user_email = ${email}
    order by b.created_at desc
  `;

  return rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    userEmail: row.user_email,
    quantity: row.quantity,
    pricePerTicket: row.price_per_ticket,
    totalPrice: row.total_price,
    createdAt: new Date(row.created_at).toISOString(),
    eventName: row.event_name ?? undefined,
    event: row.event_name
      ? {
          id: row.event_id,
          name: row.event_name,
          description: null,
          date: row.event_date
            ? new Date(row.event_date).toISOString()
            : new Date().toISOString(),
          venue: row.event_venue ?? '',
          totalTickets: row.event_total_tickets ?? 0,
          bookedTickets: row.event_booked_tickets ?? 0,
          remainingTickets:
            (row.event_total_tickets ?? 0) - (row.event_booked_tickets ?? 0),
          basePrice: Number(row.event_base_price ?? 0),
          currentPrice: Number(row.event_current_price ?? row.price_per_ticket),
          priceFloor: Number(row.event_price_floor ?? 0),
          priceCeiling: Number(row.event_price_ceiling ?? 0),
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.created_at).toISOString(),
        }
      : undefined,
  }));
}
