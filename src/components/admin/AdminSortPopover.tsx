'use client';
import { useState } from 'react';

export type SortOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
  // Visual prefix shown muted before the current label (e.g. "Sort:").
  prefix?: string;
};

export default function AdminSortPopover<T extends string>({
  value,
  options,
  onChange,
  prefix = 'Sort:',
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 bg-paper border rounded-full px-3.5 py-2 text-[13px] transition-colors ${
          open
            ? 'border-oxblood text-ink'
            : 'border-line text-ink-soft hover:border-ink hover:text-ink'
        }`}
      >
        <span className="text-muted">{prefix}</span>
        {current.label}
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-paper border border-line rounded-lg shadow-xl py-1.5">
            <div className="px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
              Sort by
            </div>
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-1.5 text-[13px] text-left hover:bg-cream cursor-pointer ${
                    active ? 'text-ink' : 'text-ink-soft'
                  }`}
                >
                  {o.label}
                  {active && (
                    <svg className="w-3.5 h-3.5 text-oxblood" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
