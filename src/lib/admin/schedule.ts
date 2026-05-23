import type { ShopHoursDay } from '@/models/ShopHours';
import type { ShiftColor } from '@/lib/shift-constants';
import { MONTH_ABBR } from '@/lib/format';
import {
  DAY_LABELS_SHORT,
  DAY_NAMES_FULL_SUN_INDEXED,
} from '@/lib/schedule-utils';
import { formatShiftRange, type StaffRoleKey } from '@/lib/staff-display';

// Pure derivations the schedule page + client component use to turn raw
// shifts + shop hours into the shapes the JSX renders. Lifted out so the
// page reads as query + named function calls, mirroring the inventory /
// messages / analytics derivations the recent audits moved here.

// The shape of one rendered shift on the schedule grid. Consumed by the
// calendar grid, the shift drawer, the feature hook, and the server page
// that builds the list. Single canonical declaration mirrors the inventory
// / messages row consolidation the prior audits shipped.
export type ShiftRow = {
  _id: string;
  dayOfWeek: number;
  hourIndex: number;
  staffName: string;
  role: string;
  color: ShiftColor;
};

export type StaffUserOption = {
  _id: string;
  name: string;
  roleKey: StaffRoleKey;
};

// `getDay()` returns 0=Sun … 6=Sat. The schedule stores dayOfWeek 0=Mon …
// 6=Sun, so this remaps a JS day-of-week into the schedule's index.
export function toMondayIndex(jsDayOfWeek: number): number {
  return (jsDayOfWeek + 6) % 7;
}

export type DayCell = {
  label: string;
  date: number;
  closed: boolean;
  isToday: boolean;
};

export function buildDayCells(
  weekStart: Date,
  shopHours: ShopHoursDay[],
  todayMondayIndex: number,
): DayCell[] {
  return DAY_LABELS_SHORT.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const closed = shopHours.find((h) => h.dayOfWeek === i)?.isClosed ?? false;
    return { label, date: d.getDate(), closed, isToday: i === todayMondayIndex };
  });
}

// Build the 9×7 GRID — rows are hours (0-8 → 8 AM–4 PM), cols are days
// (0=Mon … 6=Sun). Null means the cell is empty.
export function buildShiftGrid(shifts: ShiftRow[]): (ShiftRow | null)[][] {
  return Array.from({ length: 9 }, (_, hourIdx) =>
    Array.from({ length: 7 }, (__, dayIdx) =>
      shifts.find((s) => s.hourIndex === hourIdx && s.dayOfWeek === dayIdx) ?? null,
    ),
  );
}

export type TodayStaffEntry = {
  name: string;
  time: string;
  role: string;
  color: ShiftColor;
};

// Group today's shifts by staffName and turn each into a single "8 AM – 11 AM"
// time-range row. Two non-contiguous slots collapse into one range (a known
// quirk that matches the prior behavior).
export function buildTodayStaff(
  shifts: ShiftRow[],
  todayMondayIndex: number,
): TodayStaffEntry[] {
  const todayRows = shifts.filter((s) => s.dayOfWeek === todayMondayIndex);
  const staffMap = new Map<string, { min: number; max: number; role: string; color: ShiftColor }>();
  for (const s of todayRows) {
    const existing = staffMap.get(s.staffName);
    if (!existing) {
      staffMap.set(s.staffName, { min: s.hourIndex, max: s.hourIndex, role: s.role, color: s.color });
    } else {
      existing.min = Math.min(existing.min, s.hourIndex);
      existing.max = Math.max(existing.max, s.hourIndex);
    }
  }
  return Array.from(staffMap.entries()).map(([name, v]) => ({
    name,
    time: formatShiftRange(v.min, v.max),
    role: v.role,
    color: v.color,
  }));
}

export function buildOpenLabel(shopHours: ShopHoursDay[], todayMondayIndex: number): string {
  const todayHours = shopHours.find((h) => h.dayOfWeek === todayMondayIndex);
  if (!todayHours) return 'OPEN';
  if (todayHours.isClosed) return 'CLOSED TODAY';
  return `OPEN ${todayHours.opensAt} – ${todayHours.closesAt}`;
}

// "MAR 4 – MAR 10, 2026" — uppercase month abbreviations bracketing the
// week's date range. Year shows on the end date only.
export function buildWeekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startLabel = `${MONTH_ABBR[weekStart.getMonth()].toUpperCase()} ${weekStart.getDate()}`;
  const endLabel = `${MONTH_ABBR[weekEnd.getMonth()].toUpperCase()} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

export function buildTodayDateLabel(now: Date): { dayName: string; dateStr: string } {
  return {
    dayName: DAY_NAMES_FULL_SUN_INDEXED[now.getDay()],
    dateStr: `${MONTH_ABBR[now.getMonth()]} ${now.getDate()}`,
  };
}

// Bucket today's pickup orders into the eight per-hour slot counts. Slots
// run 9 AM (idx 0) through 5 PM (idx 7), matching `SLOT_LABELS`.
export function bucketPickupSlotCounts(pickupTimes: Array<string | Date | null | undefined>): number[] {
  const counts = new Array<number>(8).fill(0);
  for (const t of pickupTimes) {
    if (!t) continue;
    const hour = new Date(t).getHours();
    const idx = hour - 9; // slot 0 = 9 AM
    if (idx >= 0 && idx < 8) counts[idx]++;
  }
  return counts;
}
