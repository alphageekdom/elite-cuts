'use client';
import { useState } from 'react';

type ToggleProps =
  | { checked: boolean; onChange: (v: boolean) => void; defaultOn?: never }
  | { defaultOn?: boolean; checked?: never; onChange?: never };

export function Toggle({ defaultOn = false, checked, onChange }: ToggleProps) {
  const [internal, setInternal] = useState(defaultOn);
  const controlled = checked !== undefined;
  const on = controlled ? checked : internal;

  function handleClick() {
    if (controlled) onChange!(!on);
    else setInternal((v) => !v);
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={handleClick}
      className={`relative w-11 h-6 rounded-full border shrink-0 transition-colors duration-300 ${
        on ? 'bg-green border-green' : 'bg-cream-deep border-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

export function SelectField({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className="appearance-none w-full border border-line bg-paper font-sans text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors cursor-pointer pr-9"
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export const inputCls =
  'w-full border border-line bg-paper text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted/60';
export const labelCls =
  'block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2';
export const sectionTitleCls =
  'font-display text-[22px] font-medium tracking-[-0.015em]';
export const sectionSubCls = 'text-sm text-muted mb-6 max-w-[56ch]';
export const btnPrimary =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] border border-transparent transition-colors hover:bg-oxblood cursor-pointer';
export const btnGhost =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-paper text-ink-soft text-[13px] font-medium tracking-[0.02em] border border-line transition-colors hover:border-ink hover:text-ink cursor-pointer';
export const btnDanger =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-oxblood text-[13px] font-medium tracking-[0.02em] border border-oxblood/30 transition-colors hover:bg-red-soft hover:border-oxblood cursor-pointer';
