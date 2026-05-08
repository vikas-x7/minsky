'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchEventById,
  fetchEventPrice,
  fetchEvents,
} from '@/modules/events/api/events.api';

export const PRICE_POLLING_INTERVAL = 30000;

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: PRICE_POLLING_INTERVAL,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id),
    staleTime: PRICE_POLLING_INTERVAL,
    enabled: Boolean(id),
  });
}

export function useEventPrice(id: string) {
  return useQuery({
    queryKey: ['event', id, 'price'],
    queryFn: () => fetchEventPrice(id),
    refetchInterval: PRICE_POLLING_INTERVAL,
    staleTime: PRICE_POLLING_INTERVAL,
    enabled: Boolean(id),
  });
}
