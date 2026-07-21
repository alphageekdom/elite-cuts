'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';

// CSS selector for all keyboard-focusable elements — used by the Tab-cycle
// trap below. Lives here (not in a shared hook) because the trap logic is
// inline and `SlideDrawer` is the only surface that needs the selector.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  widthClass?: string;
  children: ReactNode;
};

// Slide-in drawer shell owning the overlay, slide animation, and dialog
// a11y (role, aria-modal, focus trap, Escape close). The aside stays mounted
// so the translate-x transition still plays on open/close — callers
// typically unmount their inner content when closed.
export default function SlideDrawer({
  open,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  widthClass = 'max-w-135',
  children,
}: Props) {
  const asideRef = useRef<HTMLElement>(null);

  // Lock body scroll while the drawer is open. Centralized here at the
  // dialog-modal layer so every consumer gets the same behavior — the
  // prior `useAdminDrawer({ scrollLock: false })` opt-out is gone.
  useScrollLock(open);

  // Escape goes through the shared stack so a popover opened *inside* the
  // drawer claims it first — closing only itself instead of taking the whole
  // drawer (and any unsaved edits) with it.
  useDismissOnEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = asideRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal={open || undefined}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        aria-hidden={!open || undefined}
        inert={!open}
        className={`fixed top-0 right-0 w-full ${widthClass} h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {children}
      </aside>
    </>
  );
}
