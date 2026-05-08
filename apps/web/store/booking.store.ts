'use client';

import { create } from 'zustand';
import type { StoredBooking } from '@/modules/bookings/types/bookings.types';

interface BookingState {
  quantity: number;
  userEmail: string;
  lastBooking: StoredBooking | null;
  setQuantity: (quantity: number) => void;
  setUserEmail: (email: string) => void;
  setLastBooking: (booking: StoredBooking) => void;
  reset: () => void;
}

const initialState = {
  quantity: 1,
  userEmail: '',
  lastBooking: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  setQuantity: (quantity) =>
    set({ quantity: Math.max(1, Math.min(10, quantity)) }),
  setUserEmail: (email) => set({ userEmail: email }),
  setLastBooking: (booking) => set({ lastBooking: booking }),
  reset: () => set(initialState),
}));
