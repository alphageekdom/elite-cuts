'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import { computeFloatingMenuPos } from '@/lib/floatingMenu';

type Props = {
  staffName: string;
  // Controlled open state: the parent table tracks which row's menu is open
  // so it can apply the "active row" border to the right `<tr>`. Keeping
  // this controlled avoids a redundant copy of the same flag in two places.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewProfile: () => void;
  onEdit: () => void;
};

// Width must match the rendered min-w — the position calc subtracts it from
// the trigger's right edge so the menu opens right-aligned to the button.
const MENU_WIDTH = 180;

export default function StaffActionsMenu({
  staffName,
  open,
  onOpenChange,
  onViewProfile,
  onEdit,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // The staff table card has `overflow-hidden`, which would clip a normally
  // positioned absolute dropdown on the last row. Portal the menu into the
  // body and pin it via getBoundingClientRect so it escapes that container
  // entirely. Reposition on scroll/resize so the menu tracks the trigger
  // while the page (or the table itself) scrolls.
  useLayoutEffect(() => {
    // No early-clear of menuPos: the portaled menu is also gated on `open`
    // below, so a stale position when closed never reaches the DOM, and the
    // next open overwrites menuPos via `update()`.
    if (!open) return;
    const update = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      // 3 items × ~40px ≈ 130px. computeFloatingMenuPos flips above when
      // a tight viewport would otherwise clip the menu off-screen.
      setMenuPos(
        computeFloatingMenuPos(btn.getBoundingClientRect(), {
          menuWidth: MENU_WIDTH,
          estimatedMenuHeight: 140,
        }),
      );
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${staffName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={`w-8 h-8 grid place-items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/40 ${
          open
            ? 'border-oxblood text-ink bg-cream'
            : 'border-transparent text-muted hover:text-ink hover:bg-cream/80'
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onViewProfile();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit staff
          </button>
          <Link
            href="/dashboard/schedule"
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            View schedule
          </Link>
        </div>,
        document.body,
      )}
    </>
  );
}
