// Holiday pre-order announcements: data + date helpers + active-window queries.
// Pure date math — no DB, no admin input.

export type HolidaySlug =
  | 'thanksgiving'
  | 'christmas'
  | 'easter'
  | 'memorial-day'
  | 'july-4'
  | 'labor-day';

export type Holiday = {
  slug: HolidaySlug;
  name: string;
  computeDate: (year: number) => Date;
  // Lower-case keywords matched against product name (substring).
  // Drives the inline product detail note.
  cuts: string[];
};

export type ActiveHoliday = {
  holiday: Holiday;
  date: Date;
  daysUntil: number;
};

// Reminder visible from 21 days before through the holiday day; hidden the day after.
export const HOLIDAY_WINDOW_DAYS = 21;

// ─── Date helpers ────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// month is 0-indexed (Jan=0). weekday is 0-indexed (Sun=0, Mon=1, ... Sat=6).
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0); // day 0 of next month = last day of this month
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

function firstWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  return nthWeekdayOfMonth(year, month, weekday, 1);
}

// Anonymous Gregorian algorithm for Easter Sunday.
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ─── Holiday catalog ─────────────────────────────────────────────────────────

export const HOLIDAYS: readonly Holiday[] = [
  {
    slug: 'easter',
    name: 'Easter',
    computeDate: easterDate,
    cuts: ['ham', 'lamb'],
  },
  {
    slug: 'memorial-day',
    name: 'Memorial Day',
    computeDate: (y) => lastWeekdayOfMonth(y, 4, 1), // last Monday of May
    cuts: ['brisket', 'ribs', 'steak', 'tomahawk', 'tri-tip'],
  },
  {
    slug: 'july-4',
    name: 'Independence Day',
    computeDate: (y) => new Date(y, 6, 4),
    cuts: ['brisket', 'ribs', 'steak', 'tomahawk', 'tri-tip', 'burger'],
  },
  {
    slug: 'labor-day',
    name: 'Labor Day',
    computeDate: (y) => firstWeekdayOfMonth(y, 8, 1), // first Monday of September
    cuts: ['brisket', 'ribs', 'steak', 'tomahawk', 'tri-tip'],
  },
  {
    slug: 'thanksgiving',
    name: 'Thanksgiving',
    computeDate: (y) => nthWeekdayOfMonth(y, 10, 4, 4), // 4th Thursday of November
    cuts: ['turkey'],
  },
  {
    slug: 'christmas',
    name: 'Christmas',
    computeDate: (y) => new Date(y, 11, 25),
    cuts: ['prime rib', 'ham', 'roast', 'tenderloin', 'crown'],
  },
];

// ─── Public helpers ──────────────────────────────────────────────────────────

// Returns "Today" / "Tomorrow" / "In N days". Call sites that want the
// lowercase mid-sentence form ("is today" / "is in 14 days") use .toLowerCase().
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

// ─── Public queries ──────────────────────────────────────────────────────────

// Returns the nearest holiday whose pre-order window currently contains `now`.
// "In window" = today is between (holiday - 21d) and (holiday day) inclusive.
// Day-after-holiday returns null.
export function getActiveHoliday(now: Date = new Date()): ActiveHoliday | null {
  const year = now.getFullYear();
  let best: ActiveHoliday | null = null;

  for (const holiday of HOLIDAYS) {
    // Try current year and next year so late-December lookups can find Easter the following spring.
    for (const tryYear of [year, year + 1]) {
      const date = holiday.computeDate(tryYear);
      const daysUntil = daysBetween(now, date);
      if (daysUntil >= 0 && daysUntil <= HOLIDAY_WINDOW_DAYS) {
        if (!best || daysUntil < best.daysUntil) {
          best = { holiday, date, daysUntil };
        }
      }
    }
  }
  return best;
}

// Returns the active holiday only if the given product matches one of its cuts.
// Match is a case-insensitive substring check on the product name.
export function getHolidayForCut(
  productName: string,
  now: Date = new Date(),
): ActiveHoliday | null {
  const active = getActiveHoliday(now);
  if (!active) return null;
  const name = productName.toLowerCase();
  const matches = active.holiday.cuts.some((cut) => name.includes(cut));
  return matches ? active : null;
}
