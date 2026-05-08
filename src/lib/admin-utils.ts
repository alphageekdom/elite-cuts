export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Returns a simple date string: "Jan 1, 2025"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Returns separate day and time parts for table display
export function formatDateTime(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

export function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'TODAY';
  if (days === 1) return '1 DAY AGO';
  if (days < 30) return `${days} DAYS AGO`;
  if (days < 60) return '1 MONTH AGO';
  return `${Math.floor(days / 30)} MONTHS AGO`;
}

// Deterministic color picker based on id hash
export function avatarColorForId(id: string, colors: readonly string[]): string {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Shared responsive border classes for the 5-cell stat strip used on all admin pages.
// Grid: 2-col mobile / 3-col sm / 5-col lg
export function statCellBorderClasses(idx: number): string {
  const isRightEdge2 = idx % 2 === 1;
  const isRightEdge3 = idx % 3 === 2;
  const isLastRow2 = idx >= 3;
  const isLastRow3 = idx >= 3;
  return [
    'border-r border-b border-line-soft',
    isRightEdge2 ? 'border-r-0' : '',
    isLastRow2 ? 'border-b-0' : '',
    isRightEdge3 ? 'sm:border-r-0' : 'sm:border-r',
    isLastRow3 ? 'sm:border-b-0' : 'sm:border-b',
    idx < 4 ? 'lg:border-r lg:border-line-soft' : 'lg:border-r-0',
    'lg:border-b-0',
  ]
    .filter(Boolean)
    .join(' ');
}
