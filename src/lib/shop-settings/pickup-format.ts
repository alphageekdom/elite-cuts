import { DAY_NAMES } from '@/lib/shop-settings/hours-format';
import type { ShopHoursDay } from '@/models/ShopHours';

// Pickup-note copy for the product detail page.
//
// The note used to hard-code "Order by 4 pm · Same-day pickup · North Park,
// San Diego" and "ready in about 1 hour" — none of which came from settings,
// and the lead time contradicted the configured 30 min. Everything here now
// derives from shop hours + shop settings, so renaming the city or changing
// the lead time in the admin propagates.
//
// Pure by design: the caller supplies `now` (a page.tsx already reads the
// clock; a component further down the tree may not).

// "7:00 PM" → 1140. Returns null for anything the shop-hours editor
// wouldn't produce, so callers can fall back rather than render nonsense.
export function parseClockMinutes(value: string): number | null {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?\s*$/.exec(
    value,
  );
  if (!match) return null;
  const hour12 = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hour12 < 1 || hour12 > 12 || minutes > 59) return null;
  const meridiemPm = match[3].toLowerCase() === 'p';
  const hour24 = (hour12 % 12) + (meridiemPm ? 12 : 0);
  return hour24 * 60 + minutes;
}

// 1110 → "6:30 pm", 1080 → "6 pm". Lower-case and colon-free on the hour to
// match the site's existing "Order by 4 pm" voice.
export function formatClockMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const meridiem = hour24 < 12 ? 'am' : 'pm';
  return minutes === 0
    ? `${hour12} ${meridiem}`
    : `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

// "30 min" → 30, "1 hour" → 60, "2 hours" → 120. The admin select only
// offers those three, but the field is a free string at the schema layer,
// so parse rather than switch.
export function parseLeadMinutes(value: string): number | null {
  const match =
    /^\s*(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\s*$/i.exec(
      value,
    );
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return /^h/i.test(match[2]) ? Math.round(amount * 60) : Math.round(amount);
}

// Which row of `ShopHoursDay[]` is "today" at the shop, not on the server.
// Shop hours index 0 = Monday; `Date#getDay` indexes 0 = Sunday, hence the
// rotation. The stored timezone is `"America/Los_Angeles (PT)"` — an IANA
// zone plus a human suffix — so trim at the first space before handing it to
// Intl. An unrecognised zone falls back to the server's own day rather than
// throwing.
export function shopWeekdayIndex(timezone: string, now: Date): number {
  const zone = timezone.trim().split(' ')[0];
  const toMondayFirst = (sundayFirst: number) => (sundayFirst + 6) % 7;
  const SUNDAY_FIRST_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  try {
    const short = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'short',
    }).format(now);
    const index = SUNDAY_FIRST_NAMES.indexOf(short);
    if (index >= 0) return toMondayFirst(index);
  } catch {
    // Invalid IANA zone — fall through to the server's local day.
  }
  return toMondayFirst(now.getDay());
}

// Minutes since midnight at the shop, not on the server — the companion to
// shopWeekdayIndex for gating same-day pickup on the shop-local clock. Returns
// null for an unrecognised zone so the caller can treat it as "unknown" and
// fall back rather than gate incorrectly.
export function shopMinutesOfDay(timezone: string, now: Date): number | null {
  const zone = timezone.trim().split(' ')[0];
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return hour * 60 + minute;
    }
  } catch {
    // Invalid IANA zone — fall through to null.
  }
  return null;
}

export type PickupNote = {
  // "ready in about 30 min"
  readyIn: string;
  // "Order by 6:30 pm · Same-day pickup" or "Closed today · Pickup resumes Tuesday"
  timing: string;
};

export type PickupNoteInput = {
  days: ShopHoursDay[];
  leadTime: string;
  timezone: string;
  now: Date;
};

// Same-day pickup is only honest if the order lands early enough for the
// shop to prep it before closing, so the cutoff is closing time minus lead
// time — not closing time itself.
export function getPickupNote({
  days,
  leadTime,
  timezone,
  now,
}: PickupNoteInput): PickupNote {
  const leadMinutes = parseLeadMinutes(leadTime);
  const readyIn = leadMinutes === null ? 'shortly' : `about ${leadTime.trim()}`;

  const byIndex = new Map(days.map((d) => [d.dayOfWeek, d]));
  const todayIndex = shopWeekdayIndex(timezone, now);
  const today = byIndex.get(todayIndex);

  const nextOpenDay = (): ShopHoursDay | undefined => {
    for (let step = 1; step <= 7; step++) {
      const candidate = byIndex.get((todayIndex + step) % 7);
      if (candidate && !candidate.isClosed) return candidate;
    }
    return undefined;
  };

  if (today && !today.isClosed) {
    const closes = parseClockMinutes(today.closesAt);
    if (closes !== null && leadMinutes !== null) {
      const cutoff = closes - leadMinutes;
      const nowMinutes = shopMinutesOfDay(timezone, now);
      // Same-day is only honest before the cutoff has passed. A null shop
      // clock (unrecognised zone) can't gate, so it falls back to offering
      // same-day rather than hiding it. A lead time longer than the whole
      // trading day pushes the cutoff before opening — also no same-day.
      const beforeCutoff = nowMinutes === null || nowMinutes <= cutoff;
      if (cutoff > 0 && beforeCutoff) {
        return {
          readyIn,
          timing: `Order by ${formatClockMinutes(cutoff)} · Same-day pickup`,
        };
      }
      // Past today's cutoff — point at the next open day instead of promising
      // a same-day pickup the shop can no longer prep in time.
      const next = nextOpenDay();
      if (next) {
        return {
          readyIn,
          timing: `Cutoff passed · Pickup resumes ${DAY_NAMES[next.dayOfWeek]}`,
        };
      }
      return { readyIn, timing: 'Pickup by arrangement' };
    }
    // Hours/lead unparseable — no cutoff to enforce, keep the soft promise.
    return { readyIn, timing: 'Same-day pickup' };
  }

  // Closed today — point at the next open day instead of a cutoff that
  // can't be met.
  const next = nextOpenDay();
  if (next) {
    return {
      readyIn,
      timing: `Closed today · Pickup resumes ${DAY_NAMES[next.dayOfWeek]}`,
    };
  }

  return { readyIn, timing: 'Pickup by arrangement' };
}
