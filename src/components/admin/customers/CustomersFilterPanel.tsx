'use client';
import { useEffect } from 'react';
import type { Tier } from './customerUtils';

// Filter values for the customers More filters popover. The tier multi-select
// composes with (refines) the stat-strip status filter — both apply together.
export type CustomerFilters = {
  createdFrom: string; // YYYY-MM-DD or ''
  createdTo: string;
  hasOrders: 'any' | 'yes' | 'no';
  hasSavedCuts: 'any' | 'yes' | 'no';
  tiers: Tier[];
  noteSearch: string;
};

export const EMPTY_FILTERS: CustomerFilters = {
  createdFrom: '',
  createdTo: '',
  hasOrders: 'any',
  hasSavedCuts: 'any',
  tiers: [],
  noteSearch: '',
};

export function activeFilterCount(f: CustomerFilters): number {
  let n = 0;
  if (f.createdFrom) n++;
  if (f.createdTo) n++;
  if (f.hasOrders !== 'any') n++;
  if (f.hasSavedCuts !== 'any') n++;
  if (f.tiers.length > 0) n++;
  if (f.noteSearch.trim()) n++;
  return n;
}

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'connoisseur', label: 'Connoisseur' },
  { value: 'master', label: 'Master Cut' },
];

const BOOL_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

type Props = {
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  onClear: () => void;
  onClose: () => void;
};

export default function CustomersFilterPanel({ filters, onChange, onClear, onClose }: Props) {
  const hasActive = activeFilterCount(filters) > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function update<K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleTier(t: Tier) {
    const next = filters.tiers.includes(t)
      ? filters.tiers.filter((x) => x !== t)
      : [...filters.tiers, t];
    update('tiers', next);
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-20 w-78 bg-paper border border-line rounded-lg shadow-xl py-3">
        <div className="px-3.5 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
            More filters
          </span>
          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-medium tracking-[0.04em] text-oxblood hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="px-3.5 pt-2">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">
            Joined
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.createdFrom}
              onChange={(e) => update('createdFrom', e.target.value)}
              aria-label="Joined from"
              className="flex-1 bg-cream border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-ink"
            />
            <span className="text-[11px] text-muted">→</span>
            <input
              type="date"
              value={filters.createdTo}
              onChange={(e) => update('createdTo', e.target.value)}
              aria-label="Joined to"
              className="flex-1 bg-cream border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="px-3.5 pt-3">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">
            Tier
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIER_OPTIONS.map((opt) => {
              const active = filters.tiers.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTier(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-[12px] tracking-[0.02em] border transition-colors ${
                    active
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-paper text-ink-soft border-line hover:border-ink'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-3.5 pt-3">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">
            Has orders
          </div>
          <div className="flex gap-1.5">
            {BOOL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('hasOrders', opt.value)}
                className={`flex-1 px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                  filters.hasOrders === opt.value
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-paper text-ink-soft border-line hover:border-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3.5 pt-3">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">
            Has saved cuts
          </div>
          <div className="flex gap-1.5">
            {BOOL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('hasSavedCuts', opt.value)}
                className={`flex-1 px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                  filters.hasSavedCuts === opt.value
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-paper text-ink-soft border-line hover:border-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3.5 pt-3">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">
            Search notes
          </div>
          <input
            type="text"
            value={filters.noteSearch}
            onChange={(e) => update('noteSearch', e.target.value)}
            placeholder="Text in internal notes"
            className="w-full bg-cream border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-ink placeholder:text-muted"
          />
        </div>
      </div>
    </>
  );
}
