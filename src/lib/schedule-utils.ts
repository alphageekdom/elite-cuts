// Shared schedule constants + helpers. Both the schedule client component
// and the shift drawer pull labels and bounds from here so the two surfaces
// can't drift on which hour is "8 AM" or what day-of-week 3 means.

// hourIndex 0 = 8 AM (the shop's open hour); 8 = 4 PM (the last slot).
export const HOUR_BASE = 8;

export const HOUR_LABELS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];

// Monday-indexed short day labels for the weekly calendar grid. The schedule
// stores `dayOfWeek` in 0=Mon … 6=Sun order so the labels' index matches.
export const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Sunday-indexed full day names — matches `getDay()` directly, used by the
// dark Today card to render "Wednesday Apr 23" without a re-indexing hop.
// Named distinctly from `shopHoursFormat.ts`'s `DAY_NAMES` (which is
// Monday-indexed) so a future contributor can't pick the wrong array.
export const DAY_NAMES_FULL_SUN_INDEXED = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Pickup-slot labels — eight hour-long windows from 9 AM through 5 PM. Lives
// here (not the SchedulePickupSlots component) so the server page can build
// the slot rows without importing a client component.
export const SLOT_LABELS = ['9–10A', '10–11A', '11A–12P', '12–1P', '1–2P', '2–3P', '3–4P', '4–5P'];

export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
