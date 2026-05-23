'use client';

import { Fragment } from 'react';
import { HOUR_BASE, HOUR_LABELS } from '@/lib/schedule-utils';
import type { ShiftColor } from '@/lib/shift-constants';
import { AVATAR_BG, AVATAR_FG, COLOR_SWATCH } from '@/lib/staff-display';
import type { DayCell, ShiftRow } from '@/lib/admin/schedule';

type Props = {
  days: DayCell[];
  grid: (ShiftRow | null)[][];
  now: Date;
  onShiftClick: (shift: ShiftRow) => void;
  onEmptyCellClick: (dayIdx: number, hourIdx: number) => void;
};

// Shift cards use the dashed-cream chrome (COLOR_SWATCH) for the delivery
// color so it visually reads as a generic-slot card, and the solid avatar
// chrome (AVATAR_BG + AVATAR_FG) for every other role-coded color.
function shiftCardClass(color: ShiftColor): string {
  if (color === 'delivery') {
    return `${COLOR_SWATCH.delivery} text-ink-soft`;
  }
  return `${AVATAR_BG[color]} ${AVATAR_FG[color]}`;
}

export default function ScheduleCalendarGrid({
  days,
  grid,
  now,
  onShiftClick,
  onEmptyCellClick,
}: Props) {
  return (
    <div className="bg-paper border border-line-soft rounded overflow-hidden relative min-w-0">
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 bg-linear-to-l from-paper z-20 sm:hidden" />
      <div className="overflow-x-auto">
        <div className="min-w-160">
          {/* Header */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line-soft">
            <div className="bg-cream" />
            {days.map((day) => (
              <div key={day.label} className={`px-3 py-3.5 text-center border-l border-line-soft ${day.isToday ? 'bg-ink' : 'bg-cream'}`}>
                <div className={`text-[10px] tracking-[0.22em] uppercase mb-1 ${day.isToday ? 'text-camel-soft' : 'text-muted'}`}>{day.label}</div>
                <div className={`font-display text-[22px] font-normal leading-none tracking-tight flex items-center justify-center gap-1 ${day.isToday ? 'text-cream' : day.closed ? 'text-muted' : 'text-ink'}`}>
                  <span className={day.closed ? 'line-through' : ''}>{day.date}</span>
                  <span className={`inline-block w-1.25 h-1.25 rounded-full mb-0.5 ${day.closed ? 'bg-oxblood' : 'bg-green'}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="relative">
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {HOUR_LABELS.map((hour, hourIdx) => (
                <Fragment key={`row-${hourIdx}`}>
                  <div className="h-18 flex items-start pt-1 pr-2 pl-1 font-mono text-[10px] text-muted tracking-[0.04em] text-right justify-end border-t border-line-soft">
                    {hour}
                  </div>
                  {days.map((day, dayIdx) => {
                    const shift = grid[hourIdx][dayIdx];
                    return (
                      <div
                        key={`cell-${dayIdx}`}
                        className={`h-18 border-l border-t border-line-soft p-1 relative transition-colors hover:bg-camel/4 ${day.closed ? 'bg-oxblood/5' : ''}`}
                      >
                        {shift ? (
                          <button
                            type="button"
                            onClick={() => onShiftClick(shift)}
                            className={`block w-full text-left rounded p-1.5 text-[11px] leading-tight cursor-pointer overflow-hidden transition-transform hover:scale-[1.02] hover:z-2 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-1 focus:ring-offset-paper ${shiftCardClass(shift.color)}`}
                          >
                            <div className="font-medium mb-px">{shift.staffName}</div>
                            <div className="opacity-75 text-[10px] tracking-[0.04em]">{shift.role}</div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEmptyCellClick(dayIdx, hourIdx)}
                            aria-label={`Add shift on ${day.label} at ${HOUR_LABELS[hourIdx]}`}
                            className="group block w-full h-full rounded text-muted/0 hover:text-muted hover:bg-cream-deep/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-1 focus:ring-offset-paper"
                          >
                            <span aria-hidden="true" className="font-mono text-[18px] leading-none opacity-0 group-hover:opacity-40 transition-opacity">+</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>

            {/* Now line — only on current week */}
            {days.some((d) => d.isToday) && (
              <div
                className="absolute left-14 right-0 h-0.5 bg-oxblood z-10 pointer-events-none"
                style={{ top: `calc(72px * ${Math.max(0, now.getHours() - HOUR_BASE)} + ${now.getMinutes() * 72 / 60}px)` }}
              >
                <div className="absolute -left-1 -top-0.75 w-2 h-2 rounded-full bg-oxblood" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
