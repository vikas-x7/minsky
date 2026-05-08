'use client';

import { RefreshCw, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { usePricePolling } from '@/modules/pricing/hooks/usePricePolling';
import { formatCurrency } from '@/lib/utils/format';

interface PriceDisplayProps {
  eventId: string;
  initialPrice: number;
  basePrice: number;
}

export function PriceDisplay({
  eventId,
  initialPrice,
  basePrice,
}: PriceDisplayProps) {
  const { data, isFetching, dataUpdatedAt } = usePricePolling(eventId);
  const currentPrice = data?.currentPrice ?? initialPrice;
  const diff = currentPrice - basePrice;

  return (
    <div className="border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Live Price
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentPrice)}
            </span>
            {diff > 0 && (
              <Badge variant="warning">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />+{formatCurrency(diff)}
                </span>
              </Badge>
            )}
          </div>
        </div>
        <RefreshCw
          className={`h-4 w-4 text-gray-400 ${isFetching ? 'animate-spin' : ''}`}
        />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Updates every 30s
        {dataUpdatedAt
          ? ` · Last checked ${new Date(dataUpdatedAt).toLocaleTimeString()}`
          : ''}
      </p>
    </div>
  );
}
