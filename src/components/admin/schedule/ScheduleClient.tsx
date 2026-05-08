'use client';
import { Fragment, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ScheduleTodayCard from './ScheduleTodayCard';
import ScheduleOnTodayCard from './ScheduleOnTodayCard';
import SchedulePickupSlots from './SchedulePickupSlots';
import ScheduleShopHours from './ScheduleShopHours';
import ScheduleComingUp from './ScheduleComingUp';

type View = 'day' | 'week' | 'month';
type ShiftColor = 'tangelo' | 'marcus' | 'elena' | 'sam' | 'maya' | 'delivery';

interface Shift {
  name: string;
  role: string;
  color: ShiftColor;
}

interface Day {
  label: string;
  date: number;
  closed?: boolean;
  isToday?: boolean;
}


const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];

const DAYS: Day[] = [
  { label: 'Mon', date: 28, closed: true },
  { label: 'Tue', date: 29 },
  { label: 'Wed', date: 30, isToday: true },
  { label: 'Thu', date: 1 },
  { label: 'Fri', date: 2 },
  { label: 'Sat', date: 3 },
  { label: 'Sun', date: 4 },
];

const GRID: (Shift | null)[][] = [
  // 8 AM
  [null, { name: 'Tangelo', role: 'Open · Prep', color: 'tangelo' }, { name: 'Tangelo', role: 'Open · Prep', color: 'tangelo' }, { name: 'Marcus', role: 'Charcuterie', color: 'marcus' }, { name: 'Tangelo', role: 'Open · Prep', color: 'tangelo' }, { name: 'Tangelo', role: 'Open · Prep', color: 'tangelo' }, null],
  // 9 AM
  [null, { name: 'Marcus', role: 'Counter', color: 'marcus' }, { name: 'Marcus', role: 'Counter', color: 'marcus' }, { name: 'Tangelo', role: 'Open', color: 'tangelo' }, { name: 'Marcus', role: 'Counter', color: 'marcus' }, { name: 'Marcus', role: 'Counter', color: 'marcus' }, { name: 'Tangelo', role: 'Open', color: 'tangelo' }],
  // 10 AM
  [null, { name: 'Sam', role: 'Counter', color: 'sam' }, { name: 'Elena', role: 'Sourcing', color: 'elena' }, { name: 'Sam', role: 'Counter', color: 'sam' }, { name: 'Sam', role: 'Counter', color: 'sam' }, { name: 'Sam', role: 'Counter', color: 'sam' }, { name: 'Marcus', role: 'Counter', color: 'marcus' }],
  // 11 AM
  [null, { name: '📦 Delivery', role: 'Wildwood', color: 'delivery' }, { name: 'Sam', role: 'Counter', color: 'sam' }, { name: 'Elena', role: 'Farm visit', color: 'elena' }, { name: 'Elena', role: 'Counter', color: 'elena' }, { name: 'Elena', role: 'Counter', color: 'elena' }, { name: 'Sam', role: 'Counter', color: 'sam' }],
  // 12 PM
  [null, { name: 'Maya', role: 'Counter PM', color: 'maya' }, { name: 'Maya', role: 'Counter PM', color: 'maya' }, { name: 'Maya', role: 'Counter PM', color: 'maya' }, { name: 'Maya', role: 'Counter PM', color: 'maya' }, { name: 'Maya', role: 'Counter PM', color: 'maya' }, { name: 'Elena', role: 'Counter', color: 'elena' }],
  // 1 PM
  [null, null, { name: '📦 Delivery', role: 'Hartwell', color: 'delivery' }, null, { name: '📦 Delivery', role: 'Valley Poultry', color: 'delivery' }, null, null],
  // 2 PM
  [null, { name: 'Marcus', role: 'Charcuterie', color: 'marcus' }, { name: 'Marcus', role: 'Charcuterie', color: 'marcus' }, { name: 'Marcus', role: 'Charcuterie', color: 'marcus' }, { name: 'Tangelo', role: 'Close prep', color: 'tangelo' }, { name: 'Tangelo', role: 'Peak cover', color: 'tangelo' }, null],
  // 3 PM
  [null, null, null, null, { name: 'Sam', role: 'Counter PM', color: 'sam' }, { name: 'Sam', role: 'Peak', color: 'sam' }, null],
  // 4 PM
  [null, { name: 'Sam', role: 'Close', color: 'sam' }, { name: 'Sam', role: 'Close', color: 'sam' }, { name: 'Sam', role: 'Close', color: 'sam' }, { name: 'Maya', role: 'Close', color: 'maya' }, { name: 'Maya', role: 'Close', color: 'maya' }, null],
];

const SHIFT_STYLES: Record<ShiftColor, string> = {
  tangelo: 'bg-oxblood text-cream',
  marcus: 'bg-ink text-cream',
  elena: 'bg-camel text-ink',
  sam: 'bg-green text-cream',
  maya: 'bg-camel-soft text-ink',
  delivery: 'bg-cream-deep border border-dashed border-line text-ink-soft',
};


export default function ScheduleClient() {
  const [view, setView] = useState<View>('week');

  return (
    <div>
      <AdminPageHeader
        eyebrow="Operations"
        breadcrumb="Schedule"
        title="Weekly"
        titleAccent="schedule"
        subtitle="Staff shifts, pickup slots, and shop hours"
        actions={
          <>
            <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Special hours
            </button>
            <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add shift
            </button>
          </>
        }
      />

      {/* Week Nav */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded-full bg-paper border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="w-8 h-8 rounded-full bg-paper border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div>
            <span className="font-display text-2xl font-medium tracking-tight">
              Week of Apr <em className="italic text-oxblood font-normal">28</em>
            </span>
            <span className="font-mono text-[11px] text-muted tracking-[0.04em] ml-2">APR 28 – MAY 4, 2026</span>
          </div>
          <button className="bg-ink text-cream px-4 py-1.5 rounded-full text-xs font-medium hover:bg-oxblood transition-colors">
            Today
          </button>
        </div>
        <div className="inline-flex bg-paper border border-line rounded-full p-[3px]">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                view === v ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">

        {/* Calendar */}
        <div className="bg-paper border border-line-soft rounded overflow-hidden overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Calendar Header */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line-soft">
              <div className="bg-cream" />
              {DAYS.map((day) => (
                <div
                  key={day.label}
                  className={`px-3 py-3.5 text-center border-l border-line-soft ${
                    day.isToday ? 'bg-ink' : 'bg-cream'
                  }`}
                >
                  <div className={`text-[10px] tracking-[0.22em] uppercase mb-1 ${day.isToday ? 'text-camel-soft' : 'text-muted'}`}>
                    {day.label}
                  </div>
                  <div className={`font-display text-[22px] font-normal leading-none tracking-tight flex items-center justify-center gap-1 ${day.isToday ? 'text-cream' : day.closed ? 'text-muted' : 'text-ink'}`}>
                    <span className={day.closed ? 'line-through' : ''}>{day.date}</span>
                    <span className={`inline-block w-[5px] h-[5px] rounded-full mb-[2px] ${day.closed ? 'bg-oxblood' : 'bg-green'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="relative">
              <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                {HOURS.map((hour, hourIdx) => (
                  <Fragment key={`row-${hourIdx}`}>
                    <div className="h-[72px] flex items-start pt-1 pr-2 pl-1 font-mono text-[10px] text-muted tracking-[0.04em] text-right justify-end border-t border-line-soft">
                      {hour}
                    </div>
                    {DAYS.map((day, dayIdx) => {
                      const shift = GRID[hourIdx][dayIdx];
                      return (
                        <div
                          key={`cell-${dayIdx}`}
                          className={`h-[72px] border-l border-t border-line-soft p-1 relative transition-colors hover:bg-camel/4 ${
                            day.closed ? 'bg-oxblood/5' : ''
                          }`}
                        >
                          {shift && (
                            <div
                              className={`rounded p-1.5 text-[11px] leading-tight cursor-pointer overflow-hidden transition-transform hover:scale-[1.02] hover:z-[2] hover:shadow-md ${
                                SHIFT_STYLES[shift.color]
                              }`}
                            >
                              <div className="font-medium mb-px">{shift.name}</div>
                              <div className="opacity-75 text-[10px] tracking-[0.04em]">{shift.role}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>

              {/* Now line — static at ~1:30 PM */}
              <div
                className="absolute left-[56px] right-0 h-[2px] bg-oxblood z-10 pointer-events-none"
                style={{ top: 'calc(72px * 5 + 36px)' }}
              >
                <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-oxblood" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-1">
          <ScheduleTodayCard />
          <ScheduleOnTodayCard />
          <SchedulePickupSlots />
          <ScheduleShopHours />
          <ScheduleComingUp />
        </div>
      </div>
    </div>
  );
}
