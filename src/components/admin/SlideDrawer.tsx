'use client';

import { useRef, type ReactNode } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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

  // Focus moves into the drawer on open, Tab cycles inside it, and focus
  // returns to the trigger on close. Previously only the Tab cycle lived here;
  // focus-in and restore are new, so admin drawers no longer strand keyboard
  // focus on <body>.
  useFocusTrap(open, asideRef);

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
