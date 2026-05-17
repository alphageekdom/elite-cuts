'use client';

import type { StaffFilterKey } from '@/lib/staff-display';

type Props = {
  active: StaffFilterKey;
  onChange: (next: StaffFilterKey) => void;
  counts: Record<StaffFilterKey, number>;
};

const STATUS_FILTERS: { key: StaffFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'working-today', label: 'Working Today' },
  { key: 'off-today', label: 'Off Today' },
];

const ROLE_FILTERS: { key: StaffFilterKey; label: string }[] = [
  { key: 'butchers', label: 'Butchers' },
  { key: 'counter', label: 'Counter' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'receiving', label: 'Receiving' },
];

function Pill({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium tracking-[0.04em] transition-colors ${
        isActive
          ? 'bg-oxblood text-cream border border-oxblood'
          : 'bg-paper text-ink-soft border border-line-soft hover:bg-cream'
      }`}
    >
      {label}
      <span
        className={`font-mono text-[10px] tracking-[0.04em] ${
          isActive ? 'text-cream/70' : 'text-muted'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function StaffFilters({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {STATUS_FILTERS.map((f) => (
        <Pill
          key={f.key}
          label={f.label}
          count={counts[f.key]}
          isActive={active === f.key}
          onClick={() => onChange(f.key)}
        />
      ))}
      <span className="hidden sm:inline-block w-px h-5 bg-line-soft mx-1" aria-hidden="true" />
      {ROLE_FILTERS.map((f) => (
        <Pill
          key={f.key}
          label={f.label}
          count={counts[f.key]}
          isActive={active === f.key}
          onClick={() => onChange(f.key)}
        />
      ))}
    </div>
  );
}
