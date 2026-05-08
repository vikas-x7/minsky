import { TrendingUp, Clock, BarChart3, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatPercentage } from '@/lib/utils/format';
import type { PriceBreakdown as PriceBreakdownType } from '@/modules/events/types/events.types';

interface PriceBreakdownProps {
  breakdown: PriceBreakdownType;
}

const ruleIcons: Record<string, typeof Clock> = {
  time: Clock,
  demand: TrendingUp,
  inventory: Package,
};

const ruleColors: Record<string, string> = {
  time: 'text-white bg-black',
  demand: 'text-white bg-black',
  inventory: 'text-white bg-black',
};

export function PriceBreakdown({ breakdown }: PriceBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900">
            Price Breakdown
          </h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-gray-600">Base Price</span>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(breakdown.basePrice)}
          </span>
        </div>

        {breakdown.adjustments.map((adj) => {
          const ruleKey = adj.rule.toLowerCase().split('_')[0] || 'time';
          const Icon = ruleIcons[ruleKey] || TrendingUp;
          const colorClasses =
            ruleColors[ruleKey] || 'text-gray-600 bg-gray-50';

          return (
            <div
              key={adj.rule}
              className="flex items-start gap-3 py-3 border-t border-gray-100"
            >
              <div
                className={`w-8 h-8 rounded-[3px] flex items-center justify-center flex-shrink-0 ${colorClasses}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-gray-900 break-words">
                    {adj.label}
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold ${adj.weightedAdjustment > 0 ? 'text-amber-600' : 'text-gray-500'}`}
                  >
                    {adj.weightedAdjustment > 0 ? '+' : ''}
                    {formatPercentage(adj.weightedAdjustment)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {adj.description}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Weight: {formatPercentage(adj.weight)} · Raw:{' '}
                  {formatPercentage(adj.rawAdjustment)}
                </p>
              </div>
            </div>
          );
        })}

        <div className="border-t-2 border-gray-900 pt-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900">
                Current Price
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Total adjustment:{' '}
                {breakdown.totalAdjustmentPercentage > 0 ? '+' : ''}
                {formatPercentage(breakdown.totalAdjustmentPercentage)}
              </p>
            </div>
            <span className="text-2xl font-bold leading-tight text-gray-900">
              {formatCurrency(breakdown.currentPrice)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
