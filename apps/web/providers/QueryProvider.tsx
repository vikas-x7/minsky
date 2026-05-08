'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/queryClient';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
