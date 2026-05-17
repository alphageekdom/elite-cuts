'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type Props = {
  eyebrow: string;       // e.g. "Edit shift" / "New staff"
  title: ReactNode;      // page-title heading
  titleId: string;       // id used for aria-labelledby on the dialog
  subtitle: ReactNode;   // muted line under the title
  onClose: () => void;
  children: ReactNode;   // form body (the form element typically lives inside)
};

/**
 * Shared admin slide-in drawer chrome used by the staff and shift forms.
 *
 * Owns the overlay, backdrop dismiss, dialog a11y attributes, focus trap,
 * and the standard header with eyebrow + title + subtitle + close button.
 * Callers pass the form/body as `children`.
 */
export default function FormDrawer({
  eyebrow,
  title,
  titleId,
  subtitle,
  onClose,
  children,
}: Props) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(drawerRef, onClose);

  // Mount-only: focus the close button when the drawer opens. The empty
  // dep array is intentional — parents unmount the drawer between opens.
  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">
              {eyebrow}
            </div>
            <h2
              id={titleId}
              className="font-display text-[20px] font-normal tracking-tight leading-snug"
            >
              {title}
            </h2>
            <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {children}
      </aside>
    </div>
  );
}
