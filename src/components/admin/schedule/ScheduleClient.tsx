'use client';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ScheduleTodayCard from './ScheduleTodayCard';
import ScheduleOnTodayCard from './ScheduleOnTodayCard';
import SchedulePickupSlots, { type PickupSlotRow } from './SchedulePickupSlots';
import ScheduleShopHours from './ScheduleShopHours';
import { MONTH_ABBR } from '@/lib/format';
import { getMondayOf } from '@/lib/schedule-utils';
import type { ShopHoursDay } from '@/models/ShopHours';
import type { ShiftColor } from '@/models/Shift';
// ShiftColor re-exported for ScheduleOnTodayCard usage via ScheduleClient import


export type ShiftRow = {
  _id: string;
  dayOfWeek: number;
  hourIndex: number;
  staffName: string;
  role: string;
  color: ShiftColor;
};

const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SHIFT_STYLES: Record<ShiftColor, string> = {
  tangelo:  'bg-oxblood text-cream',
  marcus:   'bg-ink text-cream',
  elena:    'bg-camel text-ink',
  sam:      'bg-green text-cream',
  maya:     'bg-camel-soft text-ink',
  delivery: 'bg-cream-deep border border-dashed border-line text-ink-soft',
};

type Props = {
  initialShifts: ShiftRow[];
  shopHours: ShopHoursDay[];
  pickupSlots: PickupSlotRow[];
  slotsBooked: number;
  projectedRevenue: number;
  deliveryCount: number;
};

export default function ScheduleClient({
  initialShifts, shopHours, pickupSlots,
  slotsBooked, projectedRevenue, deliveryCount,
}: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [shifts, setShifts] = useState<ShiftRow[]>(initialShifts);
  const [loadingShifts, setLoadingShifts] = useState(false);

  const fetchShifts = useCallback(async (ws: Date) => {
    setLoadingShifts(true);
    try {
      const res = await fetch(`/api/shifts?weekStart=${ws.toISOString()}`);
      if (!res.ok) throw new Error();
      const data: ShiftRow[] = await res.json();
      setShifts(data);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => { fetchShifts(weekStart); }, [weekStart, fetchShifts]);

  function prevWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }
  function goToday()  { setWeekStart(getMondayOf(new Date())); }

  // Build 9×7 GRID from live shifts
  const GRID: (ShiftRow | null)[][] = Array.from({ length: 9 }, (_, hourIdx) =>
    Array.from({ length: 7 }, (__, dayIdx) =>
      shifts.find((s) => s.hourIndex === hourIdx && s.dayOfWeek === dayIdx) ?? null,
    ),
  );

  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun

  // Derive today's stats for ScheduleTodayCard
  const todayShiftRows = shifts.filter((s) => s.dayOfWeek === todayDow);
  // Group by staffName to get unique staff + hour range
  const staffMap = new Map<string, { min: number; max: number; role: string; color: ShiftColor }>();
  for (const s of todayShiftRows) {
    const existing = staffMap.get(s.staffName);
    if (!existing) {
      staffMap.set(s.staffName, { min: s.hourIndex, max: s.hourIndex, role: s.role, color: s.color });
    } else {
      existing.min = Math.min(existing.min, s.hourIndex);
      existing.max = Math.max(existing.max, s.hourIndex);
    }
  }
  const todayStaff = Array.from(staffMap.entries()).map(([name, v]) => {
    const startH = v.min + 8; // hourIndex 0 = 8AM
    const endH   = v.max + 9; // +1 for end of that slot
    const fmt = (h: number) => h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
    return { name, time: `${fmt(startH)} – ${fmt(endH)}`, role: v.role, color: v.color };
  });
  const staffCount = staffMap.size;

  // Today's shop hours label
  const todayHours = shopHours.find((h) => h.dayOfWeek === todayDow);
  const openLabel = todayHours?.isClosed
    ? 'CLOSED TODAY'
    : todayHours
    ? `OPEN ${todayHours.opensAt} – ${todayHours.closesAt}`
    : 'OPEN';

  const DAYS = DAY_LABELS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const isClosed = shopHours.find((h) => h.dayOfWeek === i)?.isClosed ?? false;
    return { label, date: d.getDate(), closed: isClosed, isToday: i === todayDow };
  });

  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekStart.getDate() + 6);
  const weekLabel = `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()}`;
  const weekRangeLabel = `${weekLabel.toUpperCase()} – ${MONTH_ABBR[weekEndDate.getMonth()].toUpperCase()} ${weekEndDate.getDate()}, ${weekEndDate.getFullYear()}`;

  return (
    <div className={loadingShifts ? 'opacity-70 pointer-events-none transition-opacity' : ''}>
      <AdminPageHeader
        eyebrow="Operations"
        breadcrumb="Schedule"
        title="Weekly"
        titleAccent="schedule"
        subtitle="Staff shifts, pickup slots, and shop hours"
        actions={
          <>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors">
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
            <button onClick={prevWeek} className="w-8 h-8 rounded-full bg-paper border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={nextWeek} className="w-8 h-8 rounded-full bg-paper border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div>
            <span className="font-display text-2xl font-medium tracking-tight">
              Week of {MONTH_ABBR[weekStart.getMonth()]} <em className="italic text-oxblood font-normal">{weekStart.getDate()}</em>
            </span>
            <span className="font-mono text-[11px] text-muted tracking-[0.04em] ml-2">{weekRangeLabel}</span>
          </div>
          <button onClick={goToday} className="bg-ink text-cream px-4 py-1.5 rounded-full text-xs font-medium hover:bg-oxblood transition-colors">
            Today
          </button>
        </div>
        <span className="inline-flex bg-paper border border-line rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft">
          Week
        </span>
      </div>

      {/* Schedule Layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
        {/* Calendar */}
        <div className="bg-paper border border-line-soft rounded overflow-hidden overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line-soft">
              <div className="bg-cream" />
              {DAYS.map((day) => (
                <div key={day.label} className={`px-3 py-3.5 text-center border-l border-line-soft ${day.isToday ? 'bg-ink' : 'bg-cream'}`}>
                  <div className={`text-[10px] tracking-[0.22em] uppercase mb-1 ${day.isToday ? 'text-camel-soft' : 'text-muted'}`}>{day.label}</div>
                  <div className={`font-display text-[22px] font-normal leading-none tracking-tight flex items-center justify-center gap-1 ${day.isToday ? 'text-cream' : day.closed ? 'text-muted' : 'text-ink'}`}>
                    <span className={day.closed ? 'line-through' : ''}>{day.date}</span>
                    <span className={`inline-block w-[5px] h-[5px] rounded-full mb-[2px] ${day.closed ? 'bg-oxblood' : 'bg-green'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Body */}
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
                        <div key={`cell-${dayIdx}`}
                          className={`h-[72px] border-l border-t border-line-soft p-1 relative transition-colors hover:bg-camel/4 ${day.closed ? 'bg-oxblood/5' : ''}`}
                        >
                          {shift && (
                            <div className={`rounded p-1.5 text-[11px] leading-tight cursor-pointer overflow-hidden transition-transform hover:scale-[1.02] hover:z-[2] hover:shadow-md ${SHIFT_STYLES[shift.color]}`}>
                              <div className="font-medium mb-px">{shift.staffName}</div>
                              <div className="opacity-75 text-[10px] tracking-[0.04em]">{shift.role}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>

              {/* Now line — only on current week */}
              {DAYS.some((d) => d.isToday) && (
                <div className="absolute left-[56px] right-0 h-[2px] bg-oxblood z-10 pointer-events-none"
                  style={{ top: `calc(72px * ${Math.max(0, today.getHours() - 8)} + ${today.getMinutes() * 72 / 60}px)` }}
                >
                  <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-oxblood" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-1">
          <ScheduleTodayCard
            staffCount={staffCount}
            slotsBooked={slotsBooked}
            projectedRevenue={projectedRevenue}
            deliveryCount={deliveryCount}
            openLabel={openLabel}
          />
          <ScheduleOnTodayCard todayStaff={todayStaff} />
          <SchedulePickupSlots slots={pickupSlots} />
          <ScheduleShopHours hours={shopHours} />
        </div>
      </div>
    </div>
  );
}
