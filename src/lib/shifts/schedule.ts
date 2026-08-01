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

// The week key for a calendar day, as UTC midnight of that week's Monday.
//
// A week is a calendar fact, not an instant, so this takes a plain
// `YYYY-MM-DD` (from `shopDateKey`, or a client's own local date) and does all
// its arithmetic in UTC. That is what makes it zone-proof: the same date
// string yields the same key from any runtime.
//
// It replaces a `getDay()`-then-snap-to-UTC-date approach that only worked
// west of UTC. Local-midnight Monday is the PREVIOUS Sunday in UTC terms for
// any client east of it, so those shifts stored under a Sunday key: they
// vanished from the server-rendered grid (which queries Monday-keyed weeks),
// and the same visible cell split across two keys, defeating both the
// collision check and the unique (weekStart, dayOfWeek, hourIndex) index that
// exist to stop double-booking.
export function mondayOfShopDay(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay(); // 0 = Sunday
  utc.setUTCDate(utc.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return utc;
}

// A `localDateKey(date)` helper used to sit here, formatting a Date in the
// runtime's own zone for feeding into `mondayOfShopDay`. Every caller now
// passes `shopDateKey(timezone, instant)` instead.
//
// It is gone rather than deprecated because it had no correct caller left and
// two separate bugs came from reaching for it: the schedule's "Today" button
// jumped a week for any admin browsing from east of the shop, and the nightly
// demo restore planted its whole roster in the following week on a UTC deploy.
// A week is the shop's calendar fact, never the reader's.
