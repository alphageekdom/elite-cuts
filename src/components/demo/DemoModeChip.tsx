'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

import { FOCUS_RING } from '@/lib/styles';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';

// Small "Demo mode" badge in the top navbar (customer shell + admin shell).
// Only rendered when `session.user.isDemo` — no chip on real sessions, no
// chip when signed out. Tooltip is keyboard-focusable and dismisses on
// Escape; using a small controlled popover instead of native `title=` so
// keyboard users get parity with hover behavior.
export default function DemoModeChip() {
  const { data: session } = useSession();
  const isDemo = Boolean(session?.user?.isDemo);
  const demoType = session?.user?.demoType;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useDismissOnEscape(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isDemo) return null;

  const tooltip =
    demoType === 'admin'
      ? "You're exploring as a demo admin. Catalog and settings reset nightly."
      : "You're exploring as a demo customer. Your cart and orders clear nightly.";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          // Don't close while keyboard focus is still on the chip — that
          // would desync `aria-expanded` from the user's actual state.
          if (document.activeElement === buttonRef.current) return;
          setOpen(false);
        }}
        aria-describedby="demo-mode-tooltip"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-medium tracking-widest uppercase text-amber-900 border border-amber-200 hover:bg-amber-200 transition-colors ${FOCUS_RING}`}
      >
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        Demo mode
      </button>
      {open && (
        <div
          id="demo-mode-tooltip"
          role="tooltip"
          className="absolute right-0 top-full mt-2 w-64 rounded-md bg-ink px-3 py-2.5 text-[12px] text-cream leading-relaxed shadow-lg z-50"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
