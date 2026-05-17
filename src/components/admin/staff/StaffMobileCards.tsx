'use client';

import { getInitials } from '@/lib/format';
import {
  AVATAR_BG,
  AVATAR_FG,
  STATUS_BADGE,
  STATUS_LABEL,
} from '@/lib/staff-display';
import type { StaffRow } from './StaffPageClient';

type Props = {
  rows: StaffRow[];
  onOpenProfile: (row: StaffRow) => void;
};

export default function StaffMobileCards({ rows, onOpenProfile }: Props) {
  return (
    <div className="md:hidden grid grid-cols-1 gap-3">
      {rows.map((s) => (
        <button
          type="button"
          key={s.id}
          onClick={() => onOpenProfile(s)}
          className="w-full text-left bg-paper border border-line-soft rounded-sm p-4 active:bg-cream/60 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_BG[s.color]} ${AVATAR_FG[s.color]}`}
              aria-hidden="true"
            >
              {getInitials(s.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-display text-base font-medium tracking-tight truncate">
                  {s.name}
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.04em] shrink-0 ${STATUS_BADGE[s.status]}`}
                >
                  <span className="w-1 h-1 rounded-full bg-current" aria-hidden="true" />
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="text-[12px] text-ink-soft flex items-center gap-1.5 flex-wrap">
                {s.role && <span>{s.role}</span>}
                {s.role && s.station && <span className="text-muted">·</span>}
                {s.station && <span className="text-muted">{s.station}</span>}
              </div>
              <div className="mt-2 text-[11px] tracking-[0.04em]">
                {s.workingToday ? (
                  <span className="text-green font-medium">
                    Working today{s.todayShift ? ` · ${s.todayShift}` : ''}
                  </span>
                ) : (
                  <span className="font-mono text-muted uppercase">Off today</span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
