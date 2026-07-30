'use client';

import { useMemo } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ScheduleTodayCard from './ScheduleTodayCard';
import ScheduleOnTodayCard from './ScheduleOnTodayCard';
import SchedulePickupSlots, { type PickupSlotRow } from './SchedulePickupSlots';
import ScheduleShopHours from './ScheduleShopHours';
import ScheduleCalendarGrid from './ScheduleCalendarGrid';
import ShiftFormDrawer from './ShiftFormDrawer';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { DRAWER_WIDTH } from '@/components/admin/DrawerChrome';
import { MONTH_ABBR } from '@/lib/format';
import type { ShopHoursDay } from '@/models/ShopHours';
import {
  buildDayCells,
  buildOpenLabel,
  buildShiftGrid,
  buildTodayStaff,
  buildWeekRangeLabel,
  toMondayIndex,
  type ShiftRow,
  type StaffUserOption,
} from '@/lib/admin/schedule';
import { useScheduleWeek } from '@/hooks/admin/useScheduleWeek';

type Props = {
  initialShifts: ShiftRow[];
  shopHours: ShopHoursDay[];
  pickupSlots: PickupSlotRow[];
  slotsBooked: number;
  projectedRevenue: number;
  deliveryCount: number;
  staffUsers: StaffUserOption[];
};

export default function ScheduleClient({
  initialShifts, shopHours, pickupSlots,
  slotsBooked, projectedRevenue, deliveryCount,
  staffUsers,
}: Props) {
  const {
    weekStart, shifts, loadingShifts, drawer,
    prevWeek, nextWeek, goToday,
    openCreate, openEdit, closeDrawer, refetch,
  } = useScheduleWeek(initialShifts);

  const now = new Date();
  const todayMondayIndex = toMondayIndex(now.getDay());

  const grid = useMemo(() => buildShiftGrid(shifts), [shifts]);
  const todayStaff = useMemo(() => buildTodayStaff(shifts, todayMondayIndex), [shifts, todayMondayIndex]);
  const days = useMemo(
    () => buildDayCells(weekStart, shopHours, todayMondayIndex),
    [weekStart, shopHours, todayMondayIndex],
  );
  const openLabel = useMemo(() => buildOpenLabel(shopHours, todayMondayIndex), [shopHours, todayMondayIndex]);
  const weekRangeLabel = useMemo(() => buildWeekRangeLabel(weekStart), [weekStart]);

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
            <button onClick={() => window.print()} className="hidden sm:inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button onClick={() => openCreate()} className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
        <ScheduleCalendarGrid
          days={days}
          grid={grid}
          now={now}
          onShiftClick={openEdit}
          onEmptyCellClick={(dayIdx, hourIdx) => openCreate(dayIdx, hourIdx)}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <ScheduleTodayCard
            staffCount={todayStaff.length}
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

      <SlideDrawer
        open={drawer.kind !== 'closed'}
        onClose={closeDrawer}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="shift-form-title"
      >
        {drawer.kind !== 'closed' && (
          <ShiftFormDrawer
            shift={drawer.kind === 'edit' ? drawer.shift : null}
            defaultDayOfWeek={drawer.kind === 'create' ? (drawer.dayOfWeek ?? todayMondayIndex) : undefined}
            defaultHourIndex={drawer.kind === 'create' ? drawer.hourIndex : undefined}
            weekStart={weekStart}
            staffUsers={staffUsers}
            onClose={closeDrawer}
            onSaved={refetch}
          />
        )}
      </SlideDrawer>
    </div>
  );
}
