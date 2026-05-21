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

export type ShopHoursRow = { label: string; value: string };

// Group consecutive days that share identical hours into a single row, so
// "Tuesday – Saturday: 9:00 AM – 7:00 PM" beats listing each day verbatim.
// The run breaks naturally if an admin edits one day inside an otherwise-
// uniform stretch, so the output adapts without re-tuning the formatter.
export function formatShopHoursRows(days: ShopHoursDay[]): ShopHoursRow[] {
  const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const rows: ShopHoursRow[] = [];
  const valueOf = (d: ShopHoursDay) =>
    d.isClosed ? 'Closed' : `${d.opensAt} – ${d.closesAt}`;
  const nameOf = (dow: number) => DAY_NAMES[dow] ?? `Day ${dow}`;

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
    const label =
      j === i
        ? nameOf(sorted[i].dayOfWeek)
        : `${nameOf(sorted[i].dayOfWeek)} – ${nameOf(sorted[j].dayOfWeek)}`;
    rows.push({ label, value });
    i = j + 1;
  }

  return rows;
}
