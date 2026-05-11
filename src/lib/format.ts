export const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

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
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

/** Returns a usable src for a product image.
 *  Cloudinary / absolute URLs are passed through unchanged.
 *  Bare filenames are resolved to the local public folder. */
export function productImageSrc(image: string | undefined | null): string | null {
  if (!image) return null;
  if (image.startsWith('http') || image.startsWith('/')) return image;
  return `/images/products/${image}`;
}

/** Deterministic color picker based on id hash. */
export function avatarColorForId(id: string, colors: readonly string[]): string {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Shared responsive border classes for the stat strip grid used on all admin pages.
export function statCellBorderClasses(idx: number, cellCount = 7): string {
  const isRightEdge2  = idx % 2 === 1;
  const isLastRow2    = idx >= Math.floor((cellCount - 1) / 2) * 2;
  const isRightEdge4  = idx % 4 === 3;
  const isLastRow4    = idx >= Math.floor((cellCount - 1) / 4) * 4;
  return [
    'border-r border-b border-line-soft',
    isRightEdge2 ? 'border-r-0' : '',
    isLastRow2   ? 'border-b-0' : '',
    isRightEdge4 ? 'sm:border-r-0' : 'sm:border-r',
    isLastRow4   ? 'sm:border-b-0' : 'sm:border-b',
    idx < cellCount - 1 ? 'lg:border-r lg:border-line-soft' : 'lg:border-r-0',
    'lg:border-b-0',
  ]
    .filter(Boolean)
    .join(' ');
}

export function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'TODAY';
  if (days === 1) return '1 DAY AGO';
  if (days < 30) return `${days} DAYS AGO`;
  if (days < 60) return '1 MONTH AGO';
  return `${Math.floor(days / 30)} MONTHS AGO`;
}
