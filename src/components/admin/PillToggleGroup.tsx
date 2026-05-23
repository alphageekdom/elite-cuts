import type { ReactNode } from 'react';

// Shared chrome for the small pill-style toggles dotted across admin
// dashboards — RangeToggle (chart-card variant), AnalyticsHeatmap, and
// InventoryAgingRoom. Owns just the outer wrapper + the item class string
// so a consumer can render `<button>` or `<Link>` inside as the situation
// demands (state toggle vs route toggle).

type Props = {
  // `sm` matches the inventory aging toggle's `p-0.5`; default `md` matches
  // the chart-card toggles' `p-0.75`.
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
};

export default function PillToggleGroup({ size = 'md', children, className = '' }: Props) {
  const padding = size === 'sm' ? 'p-0.5' : 'p-0.75';
  return (
    <div className={`inline-flex bg-cream-deep rounded-full ${padding} shrink-0 ${className}`.trim()}>
      {children}
    </div>
  );
}

// `wide` (px-3.5) matches RangeToggle's original sizing alongside the
// dashboard-home stat strip; default `normal` (px-3) matches the heatmap
// and inventory toggles.
export function pillToggleItemClass(isActive: boolean, width: 'normal' | 'wide' = 'normal'): string {
  const padX = width === 'wide' ? 'px-3.5' : 'px-3';
  return `rounded-full ${padX} py-1.5 text-[12px] font-medium transition-colors ${
    isActive ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
  }`;
}
