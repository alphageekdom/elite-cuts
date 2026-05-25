'use client';

import Link from 'next/link';
import { getInitials } from '@/lib/format';
import {
  AVATAR_BG,
  AVATAR_FG,
  STATUS_BADGE,
  STATUS_LABEL,
} from '@/lib/staff/display';
import type { StaffRow } from '@/lib/staff/display';
import StaffWorkingTodayBadge from './StaffWorkingTodayBadge';

type Props = {
  staff: StaffRow;
  onClose: () => void;
  onEdit: (staff: StaffRow) => void;
};

// Drawer body — wrapped in `SlideDrawer` by the parent for focus trap +
// Escape close + aria-modal. The h2's `id="staff-profile-title"` matches
// the `ariaLabelledBy` SlideDrawer is configured with.
export default function StaffProfileDrawer({ staff, onClose, onEdit }: Props) {
  return (
    <>
      <div className="flex items-start justify-between border-b border-line-soft px-6 pb-5 pt-6 gap-4 shrink-0">
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
          type="button"
          aria-label="Close staff profile"
          onClick={onClose}
          className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-4 text-[14px] flex-1 overflow-y-auto">
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
          <StaffWorkingTodayBadge workingToday={staff.workingToday} shift={staff.todayShift} layout="inline" />
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

      <div className="border-t border-line-soft px-6 py-4 flex items-center justify-between gap-3 flex-wrap shrink-0">
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
    </>
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
