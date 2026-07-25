import type { ShopHoursDay } from '@/models/ShopHours';

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// Abbreviated day names for the condensed inline format. Index matches the
// model's 0=Mon … 6=Sun convention, same as DAY_NAMES.
export const DAY_ABBREVIATIONS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

export type ShopHoursRow = { label: string; value: string };

// Condensed rows carry `isClosed` so a consumer can style or phrase a closed
// stretch differently ("Closed Mondays") without string-matching the value.
export type ShopHoursCondensedRow = ShopHoursRow & { isClosed: boolean };

// Shared walk for both formatters: collapse runs of consecutive days that
// render the same value. The run breaks naturally if an admin edits one day
// inside an otherwise-uniform stretch, so the output adapts without
// re-tuning either formatter. Internal — the two exported formatters differ
// only in how they name days and render values.
function groupConsecutiveDays<T>(
  days: ShopHoursDay[],
  valueOf: (day: ShopHoursDay) => string,
  build: (start: ShopHoursDay, end: ShopHoursDay, value: string) => T,
): T[] {
  const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const out: T[] = [];

  let i = 0;
  while (i < sorted.length) {
    const value = valueOf(sorted[i]);
    let j = i;
    while (
      j + 1 < sorted.length &&
      sorted[j + 1].dayOfWeek === sorted[j].dayOfWeek + 1 &&
      valueOf(sorted[j + 1]) === value
    ) {
      j++;
    }
    out.push(build(sorted[i], sorted[j], value));
    i = j + 1;
  }

  return out;
}

// Group consecutive days that share identical hours into a single row, so
// "Tuesday – Saturday: 9:00 AM – 7:00 PM" beats listing each day verbatim.
export function formatShopHoursRows(days: ShopHoursDay[]): ShopHoursRow[] {
  const nameOf = (dow: number) => DAY_NAMES[dow] ?? `Day ${dow}`;
  return groupConsecutiveDays(
    days,
    (d) => (d.isClosed ? 'Closed' : `${d.opensAt} – ${d.closesAt}`),
    (start, end, value) => ({
      label:
        start === end
          ? nameOf(start.dayOfWeek)
          : `${nameOf(start.dayOfWeek)} – ${nameOf(end.dayOfWeek)}`,
      value,
    }),
  );
}

// Compact a stored clock string ("9:00 AM") to the inline form the footer and
// the Our Story visit block use ("9am"). Minutes survive when they aren't :00
// so a 9:30 open still reads correctly, and anything that doesn't parse falls
// through trimmed rather than being dropped.
export function compactClock(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (!match) return value.trim();
  const [, hour, minutes, meridiem] = match;
  const suffix = meridiem.toLowerCase() === 'a' ? 'am' : 'pm';
  return minutes === '00' ? `${hour}${suffix}` : `${hour}:${minutes}${suffix}`;
}

// The span of days the shop is open at all, e.g. "Tue–Sun" — for prose that
// wants to name the trading week in passing ("Tue–Sun on 30th Street") without
// reprinting the full hours table. Returns null when the open days can't be
// stated as one honest range, so callers can drop the clause entirely rather
// than printing something false: no day open at all, or a closure part-way
// through the week that a first-to-last span would silently paper over.
export function formatOpenDaysSpan(days: ShopHoursDay[]): string | null {
  const open = days
    .filter((d) => !d.isClosed)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  if (open.length === 0) return null;
  const nameOf = (dow: number) => DAY_ABBREVIATIONS[dow] ?? `Day ${dow}`;
  const first = nameOf(open[0].dayOfWeek);
  if (open.length === 1) return first;
  // With Wednesday closed, "Tue–Sat" would claim a trading day the shop
  // doesn't have — the range is only true if the open days run consecutively.
  const isConsecutive = open.every(
    (day, i) => i === 0 || day.dayOfWeek === open[i - 1].dayOfWeek + 1,
  );
  if (!isConsecutive) return null;
  return `${first}–${nameOf(open[open.length - 1].dayOfWeek)}`;
}

// Condensed variant of the above for tight surfaces: abbreviated day names and
// compacted times, e.g. { label: 'Tue–Sat', value: '9am–7pm' }. Grouping is
// identical to formatShopHoursRows, so the two can't disagree about which days
// belong together.
//
// Rows come back open-days-first with closures last. Grouping still runs in day
// order (only adjacent days merge) — just the finished groups are reordered, so
// a three-line footer leads with the trading hours and ends on "Closed Mon"
// rather than opening with it. Use formatShopHoursRows where strict day order
// matters, like the contact page's hours table.
export function formatShopHoursCondensed(
  days: ShopHoursDay[],
): ShopHoursCondensedRow[] {
  const nameOf = (dow: number) => DAY_ABBREVIATIONS[dow] ?? `Day ${dow}`;
  const rows = groupConsecutiveDays(
    days,
    (d) =>
      d.isClosed
        ? 'Closed'
        : `${compactClock(d.opensAt)}–${compactClock(d.closesAt)}`,
    (start, end, value) => ({
      label:
        start === end
          ? nameOf(start.dayOfWeek)
          : `${nameOf(start.dayOfWeek)}–${nameOf(end.dayOfWeek)}`,
      value,
      isClosed: start.isClosed,
    }),
  );
  return [
    ...rows.filter((r) => !r.isClosed),
    ...rows.filter((r) => r.isClosed),
  ];
}
