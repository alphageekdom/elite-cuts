import type { ShopHoursDay } from '@/models/ShopHours';
import {
  formatClockMinutes,
  parseClockMinutes,
  parseLeadMinutes,
  shopMinutesOfDay,
  shopWeekdayIndex,
} from '@/lib/shop-settings/pickup-format';

// Bookable pickup windows for the checkout picker.
//
// The picker used to be a hardcoded 10a–6p grid whose "past" flag came from
// `new Date().getHours()` in the browser. That ignored the shop's real hours
// (offering 5–6p on a Sunday that closes at four), ignored closed days
// entirely (offering eight Monday windows at a shop that shuts Mondays), and
// read the customer's clock rather than the shop's, so the same order looked
// different from New York and Hawaii.
//
// Pure by design, same contract as its sibling in `pickup-format.ts`: the
// caller supplies `now`, so a server page reads the clock once and a client
// component renders what it's handed. That also keeps the server and client
// renders identical — deriving the grid in the component would hydrate
// differently from how it server-rendered.

// A window is only bookable if the shop can still prep it: `start` must be at
// least one lead time away, and the whole hour must sit inside trading hours.
const SLOT_MINUTES = 60;

// How far ahead the picker will look for an open day when the booking window
// itself yields none. A full week, so a shop closed every day yields nothing
// rather than looping.
const MAX_LOOKAHEAD_DAYS = 7;

// The admin select offers "Same day", "3 days" and "7 days" — a span of
// calendar days, not a count of open ones. Free string at the schema layer,
// so parse rather than switch, and treat anything unreadable as same-day.
export function parseBookingWindowDays(value: string): number {
  if (/same\s*day/i.test(value)) return 1;
  const match = /(\d+)\s*day/i.exec(value);
  if (!match) return 1;
  const days = Number(match[1]);
  return Number.isFinite(days) && days >= 1
    ? Math.min(days, MAX_LOOKAHEAD_DAYS)
    : 1;
}

export type PickupSlot = {
  // ISO-like local datetime, e.g. "2026-07-28T16:00". Stored on the order.
  //
  // Deliberately not a bare label: once the picker offers more than one day,
  // "4-5p" can't say which day it means. It also makes the value parseable by
  // `new Date(...)`, which the receipt and the admin schedule bucket already
  // assumed it was — they were handed labels and produced "Invalid Date" and
  // a NaN hour respectively.
  id: string;
  // "4–5p"
  label: string;
  startMinutes: number;
};

const PICKUP_SLOT_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Lives beside the builder so the producer and every validator read one
// definition. The checkout route calls this on the way in: `pickupSlot` used
// to be free text, and the labels it accepted are exactly what made the
// receipt render "Invalid Date – Invalid Date" on every pickup order.
//
// Shape alone would pass "2026-13-45T99:99", so parse it too. An impossible
// day like Feb 30 still gets through — it rolls forward to Mar 2, which every
// reader agrees on because they all parse the same way.
export function isPickupSlotId(value: string): boolean {
  if (!PICKUP_SLOT_ID_RE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}:00`).getTime());
}

// Renders a stored slot for the prose surfaces: the confirmation page, the
// receipt and the admin order drawer. Anything that isn't a slot id comes
// back untouched — legacy orders hold a bare label like "4-5p" and an admin
// can still type free text into the walk-in drawer, and showing what was
// recorded beats showing "Invalid Date".
//
// The id is shop-local wall time carrying no zone, and it is deliberately
// parsed and printed without one: `new Date` reads it in the runtime's zone
// and the formatters print in that same zone, so the two cancel and "09:00"
// reads as 9:00 AM wherever this runs. Appending a 'Z' or passing a timeZone
// would shift it off the window the customer actually picked.
//
// The date is part of the output because the picker can now offer more than
// one day — a bare time range no longer says which one.
// Split form, for surfaces that set the day and the hours on separate lines.
// `day` is null when the stored value isn't a slot id — a legacy label has no
// date in it to show, so the caller renders `time` alone and gets exactly what
// was recorded.
export type PickupWindowParts = {
  day: string | null;
  time: string;
};

export function formatPickupWindowParts(value: string): PickupWindowParts {
  const trimmed = value.trim();
  if (!isPickupSlotId(trimmed)) return { day: null, time: trimmed };
  const start = new Date(`${trimmed}:00`);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(start)
    .replace(',', '');
  // Windows land on the hour unless the shop opens at half past, so ":00" is
  // usually dead weight — and it is what pushed "11:00 AM – 12:00 PM" onto two
  // lines in the confirmation page's large display. Minutes still print when
  // there are any.
  const at = (moment: Date) =>
    moment.toLocaleTimeString('en-US', {
      hour: 'numeric',
      ...(moment.getMinutes() === 0 ? {} : { minute: '2-digit' }),
    });
  return { day, time: `${at(start)} – ${at(end)}` };
}

export function formatPickupWindow(value: string): string {
  const { day, time } = formatPickupWindowParts(value);
  return day ? `${day} · ${time}` : time;
}

// Checkout stamps the chosen window onto `pickupLocation` because the admin
// order drawer reads that field and has no other view of the slot. Exported
// so the writer and the reader below can't drift on the separator.
export const PICKUP_LOCATION_SEPARATOR = ' — ';

// "2026-07-28T09:00 — 3045 30th Street" reads as machine output in the admin
// drawer. Format the prefix in place rather than dropping it: that prefix is
// the drawer's only sight of the slot.
export function formatPickupLocation(value: string): string {
  const [slot, ...rest] = value.split(PICKUP_LOCATION_SEPARATOR);
  if (rest.length === 0 || !isPickupSlotId(slot.trim())) return value;
  return [formatPickupWindow(slot), ...rest].join(PICKUP_LOCATION_SEPARATOR);
}

export type PickupDay = {
  // "2026-07-28"
  id: string;
  // "Today", "Tomorrow", or "Thursday"
  relativeLabel: string;
  // "Mon Jul 27"
  dateLabel: string;
  slots: PickupSlot[];
};

export type PickupDaysInput = {
  days: ShopHoursDay[];
  leadTime: string;
  timezone: string;
  // Admin setting. "Same day" keeps the picker to a single open day.
  maxBookingWindow: string;
  now: Date;
};

// "16:00" from minutes-since-midnight, for the datetime half of a slot id.
function clockKey(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// "4–5p" — same voice as the rest of the pickup copy ("Order by 4 pm"), but
// tightened for a grid cell: no space before the meridiem, and the start drops
// its meridiem when both ends share one ("10–11a", but "11a–12p" across noon).
function slotLabel(startMinutes: number): string {
  const compact = (m: number) =>
    formatClockMinutes(m).replace(/\s?([ap])m$/, '$1');
  const start = compact(startMinutes);
  const end = compact(startMinutes + SLOT_MINUTES);
  const meridiem = /[ap]$/.exec(start)?.[0];
  const shared = meridiem && end.endsWith(meridiem);
  return `${shared ? start.slice(0, -1) : start}–${end}`;
}

// The shop-local calendar date, `offset` days from now.
//
// Calendar arithmetic rather than millisecond arithmetic: adding 24h to a
// `Date` crosses a DST boundary badly (a spring-forward day is 23h, so
// "tomorrow" from late evening can land back on today). Reading the parts in
// the shop's zone and then stepping the day number sidesteps that entirely.
function shopDate(
  timezone: string,
  now: Date,
  offset: number,
): { key: string; label: string } {
  const zone = timezone.trim().split(' ')[0];
  let year: number;
  let month: number;
  let day: number;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const read = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    year = read('year');
    month = read('month');
    day = read('day');
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      throw new Error('unreadable');
    }
  } catch {
    // Unrecognised zone — fall back to the server's own date rather than
    // throwing, matching how shopWeekdayIndex degrades.
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  }

  // Noon UTC keeps the date stable under any zone offset when we format it.
  const stepped = new Date(Date.UTC(year, month - 1, day + offset, 12));
  const iso = stepped.toISOString().slice(0, 10);
  // Intl renders this as "Tue, Jul 28"; the chips read better unpunctuated
  // and match the design's "Today · Mon Jul 27".
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(stepped)
    .replace(',', '');
  return { key: iso, label };
}

function relativeLabel(offset: number, dateKey: string): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  // Past tomorrow the weekday is what a customer actually needs — "in 3 days"
  // makes them count. Read it back off the key so it can't drift from the date.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

// Every bookable window for one day. `earliestStart` is the first minute a
// window may begin — the lead-time cutoff on today, and simply opening time
// on any later day.
function buildSlots(
  row: ShopHoursDay,
  dateKey: string,
  earliestStart: number,
): PickupSlot[] {
  if (row.isClosed) return [];
  const opens = parseClockMinutes(row.opensAt);
  const closes = parseClockMinutes(row.closesAt);
  // Hours the editor can't produce — offer nothing for the day rather than
  // inventing a grid the shop never agreed to.
  if (opens === null || closes === null || closes <= opens) return [];

  // Buckets are anchored to opening time and the cutoff only filters them.
  // Anchoring to the cutoff instead slides the whole grid off the hour — at
  // 11:00 with a 30 min lead you get "11:30a–12:30p", which is not a window
  // the shop runs.
  const slots: PickupSlot[] = [];
  for (let start = opens; start + SLOT_MINUTES <= closes; start += SLOT_MINUTES) {
    if (start < earliestStart) continue;
    slots.push({
      id: `${dateKey}T${clockKey(start)}`,
      label: slotLabel(start),
      startMinutes: start,
    });
  }
  return slots;
}

// Days the customer may book, soonest first. Only days with at least one
// bookable window are returned, so a closed today or a passed cutoff simply
// doesn't appear and the next open day leads instead — there is no state where
// the picker renders an empty grid with nothing to choose.
export function buildPickupDays({
  days,
  leadTime,
  timezone,
  maxBookingWindow,
  now,
}: PickupDaysInput): PickupDay[] {
  const byIndex = new Map(days.map((d) => [d.dayOfWeek, d]));
  const todayIndex = shopWeekdayIndex(timezone, now);
  const nowMinutes = shopMinutesOfDay(timezone, now);
  const leadMinutes = parseLeadMinutes(leadTime) ?? 0;

  const dayAt = (offset: number): PickupDay | null => {
    const row = byIndex.get((todayIndex + offset) % 7);
    if (!row) return null;
    const { key, label } = shopDate(timezone, now, offset);
    // Only today is gated by the clock. A null shop clock (unrecognised zone)
    // can't gate honestly, so it leaves today fully open rather than hiding
    // windows the shop could still serve.
    const earliestStart =
      offset === 0 && nowMinutes !== null ? nowMinutes + leadMinutes : 0;
    const slots = buildSlots(row, key, earliestStart);
    if (slots.length === 0) return null;
    return {
      id: key,
      relativeLabel: relativeLabel(offset, key),
      dateLabel: label,
      slots,
    };
  };

  const windowDays = parseBookingWindowDays(maxBookingWindow);
  const withinWindow: PickupDay[] = [];
  for (let offset = 0; offset < windowDays; offset++) {
    const day = dayAt(offset);
    if (day) withinWindow.push(day);
  }
  if (withinWindow.length > 0) return withinWindow;

  // The window contained no bookable day — a closed Monday under the
  // same-day default, or a cutoff that has already passed. Reach past the
  // window for the next open day rather than rendering an empty picker: an
  // out-of-window date the customer can actually book beats a dead end.
  for (let offset = windowDays; offset < MAX_LOOKAHEAD_DAYS; offset++) {
    const day = dayAt(offset);
    if (day) return [day];
  }
  return [];
}
