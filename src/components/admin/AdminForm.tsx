'use client';

// Shared admin form primitives + style constants. Originally lived inside
// `components/admin/settings/SettingsUI.tsx` but consumers outside the
// settings tree (customer drawers, product drawer, promos client + drawer)
// were already importing from it, so the module migrated to this canonical
// home and the settings tree reaches the other way.

type ToggleProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Required for screen readers — describes which switch this is. */
  ariaLabel: string;
};

export function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full border shrink-0 transition-colors duration-300 ${
        checked ? 'bg-green border-green' : 'bg-cream-deep border-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

// `SelectField` moved to `@/components/ui/SelectField` so customer-side
// forms (address form, catalog filter bar) can consume it without a
// cross-context import. Pull it from there directly — there is no
// re-export here to keep imports honest.

export const inputCls =
  'w-full border border-line bg-paper text-sm text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted';
export const labelCls =
  'block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2';
export const sectionTitleCls =
  'font-display text-[22px] font-medium tracking-[-0.015em]';
export const sectionSubCls = 'text-sm text-muted mb-6 max-w-[56ch]';
export const btnPrimary =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] border border-transparent transition-colors hover:bg-oxblood cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-paper text-ink-soft text-[13px] font-medium tracking-[0.02em] border border-line transition-colors hover:border-ink hover:text-ink cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnDanger =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-oxblood text-[13px] font-medium tracking-[0.02em] border border-oxblood/30 transition-colors hover:bg-red-soft hover:border-oxblood cursor-pointer';

export function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-line-soft last:border-b-0 last:pb-0 space-y-4">
      <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">{label}</div>
      {children}
    </div>
  );
}

export function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

// Parses an `<input type="number">` value, returning `fallback` for blank or
// non-numeric input. Replaces the bare `Number(e.target.value)` calls that
// silently coerced empty strings to 0 across settings forms.
export function numberFromInput(value: string, fallback = 0): number {
  if (value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
