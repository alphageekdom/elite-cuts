'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// `useLayoutEffect` is fine in the browser but warns during SSR. Swap to
// `useEffect` on the server so the SSR pass stays silent — the measure
// pass only runs after the panel opens client-side anyway, so the
// behavior is identical.
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Width of the pill-variant panel (`w-52` = 208px) used to detect whether
// the panel would clip the viewport at the requested align. Field-variant
// panels are `w-full` (parent-relative), which never clip horizontally,
// so the measure pass is skipped in that variant.
const PILL_PANEL_WIDTH = 208;
const VIEWPORT_GUTTER = 8;

// Generic single-pick popover used as the canonical toolbar / filter /
// inline-action trigger across the admin shell AND the customer catalog.
// Originally `AdminSortPopover` under `components/admin/` — moved here
// once the customer catalog Sort needed the same chrome so the two
// contexts can't drift on chevron, oxblood-while-open border, or panel
// shape.
//
// The component is also generic enough to drive non-sort pickers
// (category filters, order status / cancellation reason inline action
// triggers); callers override `prefix` + `panelLabel` and the
// `<T extends string>` value type covers any enum-shaped value.
export type SortOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
  // Visual prefix shown muted before the current label (e.g. "Sort:").
  prefix?: string;
  // Heading inside the opened panel (e.g. "Sort by", "Category"). The
  // component is generic enough to drive any single-pick filter, not just
  // sorts — callers override this when the panel reads "Sort by" wouldn't fit.
  panelLabel?: string;
  // Which side of the trigger the panel anchors against. Defaults to 'right'
  // for a button on the right of a toolbar; pass 'left' when the trigger
  // sits on the left side so the panel expands rightward instead of off-screen.
  align?: 'left' | 'right';
  // Trigger label shown when `value` doesn't match any option — used by
  // inline-action triggers that need a "Select reason…" placeholder
  // before the user picks. Falls back to `options[0].label` when omitted
  // (sort triggers always start with a real value).
  placeholderLabel?: string;
  // Disables the trigger button when true — the popover never opens
  // and the trigger reads with reduced opacity.
  disabled?: boolean;
  // Hides `prefix` below sm so the trigger reads by its value alone, buying
  // back ~110px of a phone toolbar. Opt-in: the admin toolbars sit two of
  // these side by side between roughly 480–640px with width to spare, where
  // dropping the label would cost clarity for nothing.
  hidePrefixBelowSm?: boolean;
};

export default function SortPopover<T extends string>({
  value,
  options,
  onChange,
  prefix = 'Sort:',
  panelLabel = 'Sort by',
  align = 'right',
  placeholderLabel,
  disabled = false,
  hidePrefixBelowSm = false,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Resolved align starts at the requested value, then gets flipped
  // before paint if the requested anchor would clip the viewport edge.
  // Recomputed every time the panel opens (viewport size may have
  // changed between opens) and every time the requested align changes.
  const [resolvedAlign, setResolvedAlign] = useState(align);

  useIsoLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setResolvedAlign(align);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    // Requested align="right" anchors the panel's right edge to the
    // trigger's right edge; the panel extends LEFT for PILL_PANEL_WIDTH.
    // It clips the left edge of the viewport when:
    //   rect.right - PILL_PANEL_WIDTH < VIEWPORT_GUTTER
    if (align === 'right' && rect.right - PILL_PANEL_WIDTH < VIEWPORT_GUTTER) {
      setResolvedAlign('left');
      return;
    }
    // Requested align="left" anchors the panel's left edge to the
    // trigger's left edge; the panel extends RIGHT for PILL_PANEL_WIDTH.
    // It clips the right edge of the viewport when:
    //   rect.left + PILL_PANEL_WIDTH > viewportW - VIEWPORT_GUTTER
    if (align === 'left' && rect.left + PILL_PANEL_WIDTH > viewportW - VIEWPORT_GUTTER) {
      setResolvedAlign('right');
      return;
    }
    setResolvedAlign(align);
  }, [open, align]);

  const current = options.find((o) => o.value === value);
  const triggerLabel = current?.label ?? placeholderLabel ?? options[0]?.label ?? '';

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 bg-paper border rounded-full px-3.5 py-2 text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          open
            ? 'border-oxblood text-ink'
            : 'border-line text-ink-soft hover:border-ink hover:text-ink'
        }`}
      >
        <span
          className={
            hidePrefixBelowSm ? 'hidden text-muted sm:inline' : 'text-muted'
          }
        >
          {prefix}
        </span>
        {triggerLabel}
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute ${resolvedAlign === 'left' ? 'left-0' : 'right-0'} top-full mt-2 z-20 w-52 bg-paper border border-line rounded-lg shadow-xl py-1.5`}>
            <div className="px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
              {panelLabel}
            </div>
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
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
