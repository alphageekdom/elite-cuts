'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { getInitials } from '@/lib/format';
import { useScrollLock } from '@/hooks/useScrollLock';
import {
  AVATAR_BG,
  AVATAR_FG,
  STATUS_BADGE,
  STATUS_LABEL,
} from '@/lib/staff-display';
import type { StaffRow } from './StaffPageClient';

type Props = {
  staff: StaffRow | null;
  onClose: () => void;
  onEdit: (staff: StaffRow) => void;
};

export default function StaffProfileModal({ staff, onClose, onEdit }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const open = staff !== null;

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap: cycle focus between the first and last focusable elements
      // inside the dialog so keyboard users can't tab out to the page behind.
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
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
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-profile-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-line-soft bg-paper shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-line-soft px-6 pb-5 pt-6 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-full grid place-items-center font-display font-semibold text-sm shrink-0 ${AVATAR_BG[staff.color]} ${AVATAR_FG[staff.color]}`}
              aria-hidden="true"
            >
              {getInitials(staff.name)}
            </div>
            <div className="min-w-0">
              <h2
                id="staff-profile-title"
                className="font-display text-[20px] font-normal tracking-tight truncate"
              >
                {staff.name}
              </h2>
              <p className="text-[12px] text-muted mt-0.5">
                {staff.role || 'Staff member'}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close staff profile"
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/40 rounded"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-[14px]">
          <Row label="Status">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${STATUS_BADGE[staff.status]}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATUS_LABEL[staff.status]}
            </span>
          </Row>
          <Row label="Station">
            <span className="text-ink-soft">{staff.station || '—'}</span>
          </Row>
          <Row label="Today">
            {staff.workingToday ? (
              <span className="text-ink">
                <span className="text-green font-medium">Working today</span>
                {staff.todayShift && (
                  <span className="font-mono text-[12px] text-muted ml-2">
                    {staff.todayShift}
                  </span>
                )}
              </span>
            ) : (
              <span className="font-mono text-[12px] text-muted uppercase tracking-[0.04em]">
                Off today
              </span>
            )}
          </Row>
          {staff.email && (
            <Row label="Contact">
              <a
                href={`mailto:${staff.email}`}
                className="text-ink-soft hover:text-oxblood transition-colors break-all"
              >
                {staff.email}
              </a>
            </Row>
          )}
          {staff.notes && (
            <Row label="Notes">
              <span className="text-ink-soft leading-relaxed">{staff.notes}</span>
            </Row>
          )}
        </div>

        <div className="border-t border-line-soft px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/dashboard/schedule"
            className="text-[12px] tracking-[0.04em] uppercase text-oxblood hover:text-oxblood-deep transition-colors font-medium"
          >
            View schedule →
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onEdit(staff)}
              className="text-[12px] tracking-[0.04em] uppercase text-ink hover:text-oxblood transition-colors font-medium"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] tracking-[0.04em] uppercase text-muted hover:text-ink transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted pt-0.5">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
