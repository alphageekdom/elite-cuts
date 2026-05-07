'use client';
import { Fragment, useState } from 'react';
import Link from 'next/link';

type View = 'day' | 'week' | 'month';
type ShiftColor = 'tangelo' | 'marcus' | 'elena' | 'sam' | 'maya' | 'delivery';
type SlotLoad = 'light' | 'medium' | 'heavy';
type SlotStatus = 'open' | 'busy' | 'full';
type EventKind = 'delivery' | 'special' | 'holiday';

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

interface StaffEntry {
  initials: string;
  name: string;
  time: string;
  role: string;
  isLead?: boolean;
  color: ShiftColor;
}

interface PickupSlot {
  label: string;
  count: number;
  max: number;
  load: SlotLoad;
  status: SlotStatus;
}

interface ShopHour {
  day: string;
  hours: string;
  closed?: boolean;
  isToday?: boolean;
}

interface ScheduleEvent {
  kind: EventKind;
  title: string;
  meta: string;
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

const AVATAR_STYLES: Record<ShiftColor, string> = {
  tangelo: 'bg-oxblood text-cream',
  marcus: 'bg-ink text-cream',
  elena: 'bg-camel text-ink',
  sam: 'bg-green text-cream',
  maya: 'bg-camel-soft text-ink',
  delivery: 'bg-cream-deep text-ink-soft',
};

const STAFF_TODAY: StaffEntry[] = [
  { initials: 'TD', name: 'Tangelo Doe', time: '8AM – 3PM · 7HR', role: 'Lead', isLead: true, color: 'tangelo' },
  { initials: 'MR', name: 'Marcus Reyes', time: '9AM – 4PM · 7HR', role: 'Butcher', color: 'marcus' },
  { initials: 'SO', name: 'Sam Okafor', time: '11AM – 7PM · 8HR', role: 'Counter', color: 'sam' },
  { initials: 'MP', name: 'Maya Park', time: '12PM – 7PM · 7HR', role: 'Counter', color: 'maya' },
];

const PICKUP_SLOTS: PickupSlot[] = [
  { label: '9–10A', count: 3, max: 10, load: 'light', status: 'open' },
  { label: '10–11A', count: 6, max: 10, load: 'medium', status: 'open' },
  { label: '11A–12P', count: 10, max: 10, load: 'heavy', status: 'full' },
  { label: '12–1P', count: 9, max: 10, load: 'heavy', status: 'busy' },
  { label: '1–2P', count: 5, max: 10, load: 'medium', status: 'open' },
  { label: '2–3P', count: 2, max: 10, load: 'light', status: 'open' },
  { label: '3–4P', count: 1, max: 10, load: 'light', status: 'open' },
  { label: '4–5P', count: 4, max: 10, load: 'medium', status: 'open' },
];

const SLOT_FILL_STYLES: Record<SlotLoad, string> = {
  light: 'bg-green',
  medium: 'bg-camel',
  heavy: 'bg-oxblood',
};

const SLOT_STATUS_STYLES: Record<SlotStatus, string> = {
  open: 'text-green',
  busy: 'text-amber',
  full: 'text-oxblood',
};

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  full: 'Full',
};

const SHOP_HOURS: ShopHour[] = [
  { day: 'Monday', hours: 'CLOSED', closed: true },
  { day: 'Tuesday', hours: '9AM – 7PM' },
  { day: 'Wednesday', hours: '9AM – 7PM', isToday: true },
  { day: 'Thursday', hours: '9AM – 7PM' },
  { day: 'Friday', hours: '9AM – 7PM' },
  { day: 'Saturday', hours: '9AM – 7PM' },
  { day: 'Sunday', hours: '10AM – 4PM' },
];

const EVENTS: ScheduleEvent[] = [
  { kind: 'delivery', title: 'Hartwell Ranch delivery', meta: 'TODAY · 1 PM · ~120 LB BEEF' },
  { kind: 'delivery', title: 'Wildwood Farm delivery', meta: 'FRI MAY 2 · 11 AM · ~60 LB PORK' },
  { kind: 'special', title: 'Wagyu allocation drop', meta: 'SAT MAY 3 · A5 STRIPLOIN · MEMBERS FIRST' },
  { kind: 'holiday', title: 'Cinco de Mayo – extended hours', meta: 'MON MAY 5 · OPEN 9AM – 8PM (SPECIAL)' },
];

function DeliveryIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function ScheduleClient() {
  const [view, setView] = useState<View>('week');

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-9 gap-6 flex-wrap">
        <div className="w-full flex items-center gap-2 text-[12px] text-muted tracking-[0.04em] mb-1">
          <Link href="/dashboard" className="hover:text-oxblood transition-colors">
            Dashboard
          </Link>
          <svg className="w-2.5 h-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-ink">Schedule</span>
        </div>

        <div>
          <div className="font-display italic text-sm text-camel mb-1.5">Operations</div>
          <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
            Weekly <em className="italic text-oxblood">schedule</em>
          </h1>
          <p className="text-muted text-sm tracking-[0.02em]">Staff shifts, pickup slots, and shop hours</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

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

          {/* Today Card */}
          <div className="col-span-2 xl:col-span-1 bg-ink text-cream rounded p-7 relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-[260px] h-[260px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(184,137,90,.18) 0%, transparent 60%)' }}
            />
            <div className="relative z-[2]">
              <div className="text-[10px] tracking-[0.22em] uppercase text-camel-soft mb-3.5 flex items-center gap-2">
                <span className="w-4 h-px bg-current opacity-60 inline-block" />
                Today
              </div>
              <div className="font-display text-4xl font-normal tracking-tight leading-none mb-1.5">
                Wednesday{' '}
                <em className="italic text-camel-soft text-xl font-normal ml-1.5">Apr 30</em>
              </div>
              <div className="font-mono text-xs tracking-[0.04em] mb-5" style={{ color: 'rgba(244,238,228,.65)' }}>
                OPEN 9AM – 7PM · 10 HOURS
              </div>
              <div className="grid grid-cols-2 gap-3 pt-5 border-t" style={{ borderColor: 'rgba(244,238,228,.1)' }}>
                {[
                  { v: '4', unit: 'staff', label: 'On today' },
                  { v: '18', unit: 'slots', label: 'Slots booked' },
                  { v: '$2.1K', unit: 'est', label: 'Projected rev' },
                  { v: '1', unit: '📦', label: 'Deliveries' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="font-display text-2xl font-normal tracking-tight leading-none mb-1">
                      {stat.v}
                      <em className="italic text-camel text-sm font-normal ml-0.5">{stat.unit}</em>
                    </div>
                    <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,238,228,.5)' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* On Today Card */}
          <div className="bg-paper border border-line-soft rounded p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="font-display text-lg font-medium tracking-tight">
                On <em className="italic text-oxblood font-normal">today</em>
              </span>
              <a href="#" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
                All staff <ChevronRight />
              </a>
            </div>
            <div className="flex flex-col">
              {STAFF_TODAY.map((staff, i) => (
                <div
                  key={staff.name}
                  className={`flex items-center gap-3 py-3 ${i < STAFF_TODAY.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_STYLES[staff.color]}`}>
                    {staff.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm font-medium tracking-tight mb-0.5">{staff.name}</div>
                    <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{staff.time}</div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium ${staff.isLead ? 'bg-red-soft text-oxblood' : 'bg-ink/[6%] text-ink-soft'}`}>
                    {staff.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pickup Slots Card */}
          <div className="bg-paper border border-line-soft rounded p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="font-display text-lg font-medium tracking-tight">
                Pickup <em className="italic text-oxblood font-normal">slots</em>
              </span>
              <a href="#" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
                Manage <ChevronRight />
              </a>
            </div>
            <div className="flex flex-col gap-2">
              {PICKUP_SLOTS.map((slot) => (
                <div key={slot.label} className="flex items-center gap-3 px-3.5 py-2.5 bg-cream border border-line-soft rounded">
                  <span className="font-mono text-xs font-medium tracking-[0.02em] min-w-[58px]">{slot.label}</span>
                  <div className="flex-1">
                    <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${SLOT_FILL_STYLES[slot.load]}`}
                        style={{ width: `${(slot.count / slot.max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-muted tracking-[0.04em] min-w-[38px] text-right">
                    {slot.count}/{slot.max}
                  </span>
                  <span className={`text-[10px] font-medium tracking-[0.08em] uppercase min-w-[34px] text-right ${SLOT_STATUS_STYLES[slot.status]}`}>
                    {SLOT_STATUS_LABEL[slot.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shop Hours Card */}
          <div className="bg-paper border border-line-soft rounded p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="font-display text-lg font-medium tracking-tight">
                Shop <em className="italic text-oxblood font-normal">hours</em>
              </span>
              <a href="#" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
                Edit <ChevronRight />
              </a>
            </div>
            <div>
              {SHOP_HOURS.map((h, i) => (
                <div
                  key={h.day}
                  className={`flex justify-between items-baseline py-2 text-[13px] ${
                    h.isToday ? 'bg-oxblood/[4%] -mx-3.5 px-3.5 rounded' : ''
                  } ${i < SHOP_HOURS.length - 1 ? 'border-b border-line-soft' : ''}`}
                >
                  <span className={h.isToday ? 'text-ink font-medium' : 'text-ink-soft'}>{h.day}</span>
                  <span className={`font-mono text-xs font-medium tracking-[0.02em] ${h.closed ? 'text-oxblood' : 'text-ink'}`}>
                    {h.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Up Card */}
          <div className="bg-paper border border-line-soft rounded p-6">
            <div className="mb-4">
              <span className="font-display text-lg font-medium tracking-tight">
                Coming <em className="italic text-oxblood font-normal">up</em>
              </span>
            </div>
            <div className="flex flex-col">
              {EVENTS.map((event, i) => (
                <div
                  key={event.title}
                  className={`flex items-start gap-3 py-3 ${i < EVENTS.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mt-px ${
                      event.kind === 'delivery'
                        ? 'bg-cream-deep text-ink-soft'
                        : event.kind === 'special'
                        ? 'bg-amber-soft text-amber'
                        : 'bg-green-soft text-green'
                    }`}
                  >
                    {event.kind === 'delivery' && <DeliveryIcon />}
                    {event.kind === 'special' && <StarIcon />}
                    {event.kind === 'holiday' && <CalendarIcon />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm font-medium tracking-tight leading-tight mb-0.5">
                      {event.title}
                    </div>
                    <div className="font-mono text-[10px] text-muted tracking-[0.04em] leading-relaxed">
                      {event.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
