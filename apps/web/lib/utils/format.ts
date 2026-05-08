export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Event has passed';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return `In ${Math.ceil(diffDays / 30)} months`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getAvailabilityStatus(
  totalTickets: number,
  bookedTickets: number,
): { label: string; color: string; urgency: 'high' | 'medium' | 'low' } {
  const remaining = totalTickets - bookedTickets;
  const percentage = (remaining / totalTickets) * 100;

  if (remaining === 0) {
    return { label: 'Sold Out', color: 'text-red-600', urgency: 'high' };
  }
  if (percentage <= 10) {
    return {
      label: `Only ${remaining} left!`,
      color: 'text-red-500',
      urgency: 'high',
    };
  }
  if (percentage <= 20) {
    return {
      label: `${remaining} remaining`,
      color: 'text-amber-600',
      urgency: 'medium',
    };
  }
  return {
    label: `${remaining} available`,
    color: 'text-emerald-600',
    urgency: 'low',
  };
}

export function getDaysUntilEvent(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
