'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmailSearchProps {
  defaultEmail: string;
}

export function EmailSearch({ defaultEmail }: EmailSearchProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(() => {
      router.push(`/my-bookings?email=${encodeURIComponent(trimmed)}`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
        required
      />
      <Button type="submit" variant="primary" size="md" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        {isPending ? 'Searching...' : 'Search'}
      </Button>
    </form>
  );
}
