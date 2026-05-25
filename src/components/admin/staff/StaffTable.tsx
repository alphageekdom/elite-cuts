'use client';

import { useState } from 'react';

import { getInitials } from '@/lib/format';
import {
  AVATAR_BG,
  AVATAR_FG,
  STATUS_BADGE,
  STATUS_LABEL,
} from '@/lib/staff/display';
import AdminRowActionsMenu, { type RowActionsMenuItem } from '@/components/admin/AdminRowActionsMenu';
import StaffWorkingTodayBadge from './StaffWorkingTodayBadge';
import type { StaffRow } from '@/lib/staff/display';

// SVG icons reused by every staff row — defined module-scope so React doesn't
// re-create them on every render.
const ICON_VIEW = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ICON_EDIT = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

type Props = {
  rows: StaffRow[];
  onOpenProfile: (row: StaffRow) => void;
  onEdit: (row: StaffRow) => void;
};

export default function StaffTable({ rows, onOpenProfile, onEdit }: Props) {
  // The parent tracks which row's menu is open so the matching `<tr>` can
  // pick up the active-row ring. One id at a time — opening another menu
  // implicitly closes whichever was previously open.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="bg-paper border border-line-soft rounded-sm overflow-hidden hidden md:block">
      <table className="w-full border-collapse text-[14px]">
        <thead className="bg-cream border-b border-line-soft">
          <tr>
            <th scope="col" className="text-left px-6 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              Name
            </th>
            <th scope="col" className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              Role
            </th>
            <th scope="col" className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              Station
            </th>
            <th scope="col" className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              Status
            </th>
            <th scope="col" className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              Today
            </th>
            <th scope="col" className="text-right px-6 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const isMenuOpen = openMenuId === s.id;
            return (
            <tr
              key={s.id}
              className={`group hover:bg-cream/40 transition-colors ${
                i < rows.length - 1 ? 'border-b border-line-soft' : ''
              } ${isMenuOpen ? 'ring-1 ring-inset ring-ink' : ''}`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_BG[s.color]} ${AVATAR_FG[s.color]}`}
                    aria-hidden="true"
                  >
                    {getInitials(s.name)}
                  </div>
                  <div className="font-display text-sm font-medium tracking-tight">
                    {s.name}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                {s.role ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium bg-ink/6 text-ink-soft">
                    {s.role}
                  </span>
                ) : (
                  <span className="text-muted text-[13px]">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-[13px] text-ink-soft">
                {s.station || <span className="text-muted">—</span>}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${STATUS_BADGE[s.status]}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                  {STATUS_LABEL[s.status]}
                </span>
              </td>
              <td className="px-4 py-4">
                <StaffWorkingTodayBadge workingToday={s.workingToday} shift={s.todayShift} />
              </td>
              <td className="px-6 py-4 text-right">
                <AdminRowActionsMenu
                  ariaLabel={`Actions for ${s.name}`}
                  open={isMenuOpen}
                  onOpenChange={(next) => setOpenMenuId(next ? s.id : null)}
                  items={[
                    { label: 'View profile', icon: ICON_VIEW, onSelect: () => onOpenProfile(s) },
                    { label: 'Edit staff', icon: ICON_EDIT, onSelect: () => onEdit(s) },
                  ] satisfies RowActionsMenuItem[]}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
