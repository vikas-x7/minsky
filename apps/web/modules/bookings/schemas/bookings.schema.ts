import { z } from 'zod';

export const bookingFormSchema = z.object({
  eventId: z.string().uuid('Invalid event'),
  userEmail: z.string().trim().email('Enter a valid email address'),
  quantity: z
    .number()
    .int()
    .min(1, 'Select at least 1 ticket')
    .max(10, 'Maximum 10 tickets'),
});

export const emailLookupSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
