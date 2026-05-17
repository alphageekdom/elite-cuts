'use client';

import { getInitials } from '@/lib/format';
import {
  AVATAR_BG,
  AVATAR_FG,
  STATUS_BADGE,
  STATUS_LABEL,
} from '@/lib/staff-display';
import StaffActionsMenu from './StaffActionsMenu';
import type { StaffRow } from './StaffPageClient';

type Props = {
  rows: StaffRow[];
  onOpenProfile: (row: StaffRow) => void;
};

export default function StaffTable({ rows, onOpenProfile }: Props) {
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
          {rows.map((s, i) => (
            <tr
              key={s.id}
              className={`group cursor-pointer hover:bg-cream/40 transition-colors ${
                i < rows.length - 1 ? 'border-b border-line-soft' : ''
              }`}
              onClick={() => onOpenProfile(s)}
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
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium bg-ink/6 text-ink-soft">
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
                {s.workingToday ? (
                  <div className="flex flex-col">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.04em] text-green">
                      <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden="true" />
                      Working today
                    </span>
                    {s.todayShift && (
                      <span className="font-mono text-[11px] text-muted tracking-[0.04em] mt-0.5">
                        {s.todayShift}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
                    Off today
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <StaffActionsMenu
                  staffName={s.name}
                  onViewProfile={() => onOpenProfile(s)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
