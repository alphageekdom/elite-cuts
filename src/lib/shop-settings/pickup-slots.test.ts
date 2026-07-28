import { describe, expect, it } from 'vitest';

import {
  buildPickupDays,
  formatPickupLocation,
  formatPickupWindow,
  isPickupSlotId,
  PICKUP_LOCATION_SEPARATOR,
} from '@/lib/shop-settings/pickup-slots';
import type { ShopHoursDay } from '@/models/ShopHours';

// Mirrors the shipped defaults: index 0 is Monday and Monday is the closed
// day, Tue–Sat trade 9–7, Sunday is short at 10–4.
const DAYS: ShopHoursDay[] = [
  { dayOfWeek: 0, opensAt: '', closesAt: '', isClosed: true },
  { dayOfWeek: 1, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false },
  { dayOfWeek: 2, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false },
  { dayOfWeek: 3, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false },
  { dayOfWeek: 4, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false },
  { dayOfWeek: 5, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false },
  { dayOfWeek: 6, opensAt: '10:00 AM', closesAt: '4:00 PM', isClosed: false },
];

const TZ = 'America/Los_Angeles (PT)';

const build = (now: Date, over: Partial<Parameters<typeof buildPickupDays>[0]> = {}) =>
  buildPickupDays({
    days: DAYS,
    leadTime: '30 min',
    timezone: TZ,
    maxBookingWindow: 'Same day',
    now,
    ...over,
  });

// 2026-07-27 is a Monday. 18:00Z = 11:00 PT.
const MONDAY_11AM_PT = new Date('2026-07-27T18:00:00Z');
// 2026-07-28 is a Tuesday.
const TUESDAY_11AM_PT = new Date('2026-07-28T18:00:00Z');

describe('buildPickupDays', () => {
  it('skips a closed day entirely and leads with the next open one', () => {
    const [first, ...rest] = build(MONDAY_11AM_PT);
    // The bug this replaces: eight Monday windows at a shop that shuts Mondays.
    expect(first.id).toBe('2026-07-28');
    expect(first.relativeLabel).toBe('Tomorrow');
    expect(first.dateLabel).toBe('Tue Jul 28');
    expect(rest).toHaveLength(0);
  });

  it('offers the same Monday once the shop trades on it', () => {
    // Complement of the test above: proves Monday is skipped *because* it is
    // flagged closed, not for anything incidental about the date.
    const openMonday = DAYS.map((d) =>
      d.dayOfWeek === 0
        ? { ...d, opensAt: '9:00 AM', closesAt: '7:00 PM', isClosed: false }
        : d,
    );
    const [first] = build(MONDAY_11AM_PT, { days: openMonday });
    expect(first.relativeLabel).toBe('Today');
    expect(first.dateLabel).toBe('Mon Jul 27');
  });

  it('never returns a day with an empty grid', () => {
    for (const now of [MONDAY_11AM_PT, TUESDAY_11AM_PT]) {
      for (const day of build(now, { maxBookingWindow: '3 days' })) {
        expect(day.slots.length).toBeGreaterThan(0);
      }
    }
  });

  it('honours real opening hours rather than a fixed grid', () => {
    // Tuesday trades 9–7, so the last bookable window starts at 6p.
    const [tuesday] = build(TUESDAY_11AM_PT, { now: TUESDAY_11AM_PT });
    expect(tuesday.slots.at(-1)?.label).toBe('6–7p');
  });

  it('stops Sunday at its earlier closing time', () => {
    // 2026-08-02 is a Sunday; 15:00Z = 08:00 PT, before the 10am open.
    const [sunday] = build(new Date('2026-08-02T15:00:00Z'));
    expect(sunday.dateLabel).toBe('Sun Aug 2');
    expect(sunday.slots[0].label).toBe('10–11a');
    // Closes at 4p, so 3–4p is the last window and 4–5p must not appear.
    expect(sunday.slots.at(-1)?.label).toBe('3–4p');
    expect(sunday.slots.map((s) => s.label)).not.toContain('4–5p');
  });

  it('applies the lead time as a cutoff on today only', () => {
    // Tuesday 11:00 PT + 30 min lead — 11–12p has already begun, so the first
    // bookable window is 12–1p.
    const [today] = build(TUESDAY_11AM_PT);
    expect(today.relativeLabel).toBe('Today');
    expect(today.slots[0].label).toBe('12–1p');
  });

  it('drops today once its cutoff has passed and rolls to the next day', () => {
    // Tuesday 18:45 PT: 19:15 is past the 7p close, so nothing is bookable.
    const [first] = build(new Date('2026-07-29T01:45:00Z'));
    expect(first.relativeLabel).toBe('Tomorrow');
    expect(first.dateLabel).toBe('Wed Jul 29');
  });

  it('spans the configured window in calendar days, not open days', () => {
    // The admin select offers exactly these three.
    expect(build(TUESDAY_11AM_PT)).toHaveLength(1);
    // Tue/Wed/Thu are all trading days, so a 3-day span yields three.
    expect(build(TUESDAY_11AM_PT, { maxBookingWindow: '3 days' })).toHaveLength(3);
    // Sat/Sun/Mon spans three calendar days but Monday is closed, so two.
    expect(
      build(new Date('2026-08-01T18:00:00Z'), { maxBookingWindow: '3 days' }),
    ).toHaveLength(2);
  });

  it('labels beyond tomorrow by weekday, since open days are not consecutive', () => {
    // Saturday: Sunday is tomorrow, Monday is closed, so the third chip is
    // Tuesday — which is exactly why it cannot say "in 2 days".
    const days = build(new Date('2026-08-01T18:00:00Z'), {
      maxBookingWindow: '7 days',
    });
    expect(days.slice(0, 3).map((d) => d.relativeLabel)).toEqual([
      'Today',
      'Tomorrow',
      'Tuesday',
    ]);
    expect(days[2].dateLabel).toBe('Tue Aug 4');
  });

  it('reaches past the window rather than showing an empty picker', () => {
    // Monday under the same-day default: the window holds no bookable day, so
    // the next open one is offered even though it is out of window.
    const [only] = build(MONDAY_11AM_PT);
    expect(only.dateLabel).toBe('Tue Jul 28');
  });

  it('gives every slot a parseable datetime id, unlike the old labels', () => {
    const [day] = build(TUESDAY_11AM_PT);
    for (const slot of day.slots) {
      expect(Number.isNaN(new Date(slot.id).getTime())).toBe(false);
    }
    expect(day.slots[0].id).toBe('2026-07-28T12:00');
    // The old format is what produced "Invalid Date" on the receipt.
    expect(Number.isNaN(new Date('4-5p').getTime())).toBe(true);
  });

  it('offers nothing when every day is closed rather than looping', () => {
    const shut = DAYS.map((d) => ({ ...d, isClosed: true }));
    expect(build(TUESDAY_11AM_PT, { days: shut })).toEqual([]);
  });

  it('falls back to an open today when the timezone is unrecognised', () => {
    // No shop clock means no honest cutoff, so today stays fully open rather
    // than hiding windows the shop could still serve.
    const [today] = build(TUESDAY_11AM_PT, { timezone: 'Not/AZone' });
    expect(today.slots[0].label).toBe('9–10a');
  });

  it('ignores hours the editor could not have produced', () => {
    const broken = DAYS.map((d) =>
      d.dayOfWeek === 1 ? { ...d, closesAt: 'whenever' } : d,
    );
    // Tuesday is unusable, so Wednesday leads instead of a garbage grid.
    const [first] = build(TUESDAY_11AM_PT, { days: broken });
    expect(first.dateLabel).toBe('Wed Jul 29');
  });
});

describe('DST boundary', () => {
  // Sun 1 Nov 2026, 00:30 PDT — the start of the PT fall-back day, which runs
  // 25 hours. Millisecond stepping breaks here: +24h from this instant is
  // still Sun 1 Nov (23:30 PST) and +48h is Mon 2 Nov, so every day past
  // today would be labelled one behind the hours it was actually built from.
  const FALL_BACK_MIDNIGHT_PT = new Date('2026-11-01T07:30:00Z');

  it('keeps dates aligned with the weekday whose hours they used', () => {
    const days = build(FALL_BACK_MIDNIGHT_PT, { maxBookingWindow: '7 days' });
    expect(days.map((d) => d.dateLabel)).toEqual([
      'Sun Nov 1',
      // Monday is closed and drops out. Under ms stepping this would read
      // "Mon Nov 2" — Tuesday's hours under Monday's date.
      'Tue Nov 3',
      'Wed Nov 4',
      'Thu Nov 5',
      'Fri Nov 6',
      'Sat Nov 7',
    ]);
  });

  it('stamps slot ids with the same date the chip shows', () => {
    for (const day of build(FALL_BACK_MIDNIGHT_PT, {
      maxBookingWindow: '7 days',
    })) {
      for (const slot of day.slots) {
        expect(slot.id.startsWith(`${day.id}T`)).toBe(true);
      }
    }
  });

  it('still offers the fall-back day itself from just after midnight', () => {
    const [today] = build(FALL_BACK_MIDNIGHT_PT);
    expect(today.relativeLabel).toBe('Today');
    // Sunday trades 10–4, so six whole hours remain bookable.
    expect(today.slots).toHaveLength(6);
  });
});

describe('isPickupSlotId', () => {
  it('accepts every id the builder produces', () => {
    for (const day of build(TUESDAY_11AM_PT, { maxBookingWindow: '7 days' })) {
      for (const slot of day.slots) {
        expect(isPickupSlotId(slot.id)).toBe(true);
      }
    }
  });

  it('rejects the legacy labels that broke the receipt', () => {
    expect(isPickupSlotId('4-5p')).toBe(false);
    expect(isPickupSlotId('Sat 10am–12pm')).toBe(false);
  });

  it('rejects junk a tampered request could send', () => {
    for (const junk of [
      '',
      '   ',
      '<script>alert(1)</script>',
      '2026-7-8T6:00',
      '2026-07-28T16:00:00',
      '2026-07-28',
    ]) {
      expect(isPickupSlotId(junk)).toBe(false);
    }
  });

  it('rejects a well-shaped id that is not a real time', () => {
    // Shape passes, parsing does not — this is why the check is not a bare
    // regex test.
    expect(isPickupSlotId('2026-13-45T99:99')).toBe(false);
  });
});

describe('formatPickupWindow', () => {
  it('renders an id as a dated hour window', () => {
    expect(formatPickupWindow('2026-07-28T09:00')).toBe(
      'Tue Jul 28 · 9:00 AM – 10:00 AM',
    );
  });

  it('crosses noon and midnight-adjacent hours without wrapping wrong', () => {
    expect(formatPickupWindow('2026-07-28T11:00')).toBe(
      'Tue Jul 28 · 11:00 AM – 12:00 PM',
    );
    expect(formatPickupWindow('2026-07-28T18:00')).toBe(
      'Tue Jul 28 · 6:00 PM – 7:00 PM',
    );
  });

  it('reads the id as wall time regardless of the runtime zone', () => {
    // The id carries no zone: parsing and formatting both use the runtime's,
    // so they cancel. If this ever renders 4:00 PM somewhere, something has
    // appended a 'Z' or passed a timeZone option.
    expect(formatPickupWindow('2026-07-28T09:00')).toContain('9:00 AM');
  });

  it('passes legacy labels and admin free text through untouched', () => {
    // These are what produced "Invalid Date – Invalid Date" before the guard.
    expect(formatPickupWindow('4-5p')).toBe('4-5p');
    expect(formatPickupWindow('Sat 10am–12pm')).toBe('Sat 10am–12pm');
  });

  it('never emits "Invalid Date" for junk', () => {
    for (const junk of ['', 'whenever', '2026-13-45T99:99']) {
      expect(formatPickupWindow(junk)).not.toContain('Invalid');
    }
  });
});

describe('formatPickupLocation', () => {
  const address = '3045 30th Street, San Diego, CA 92104';

  it('formats the slot prefix and keeps the address', () => {
    expect(
      formatPickupLocation(`2026-07-28T09:00${PICKUP_LOCATION_SEPARATOR}${address}`),
    ).toBe(`Tue Jul 28 · 9:00 AM – 10:00 AM${PICKUP_LOCATION_SEPARATOR}${address}`);
  });

  it('leaves a bare address alone', () => {
    expect(formatPickupLocation(address)).toBe(address);
  });

  it('leaves a legacy label prefix alone rather than mangling it', () => {
    const legacy = `4-5p${PICKUP_LOCATION_SEPARATOR}${address}`;
    expect(formatPickupLocation(legacy)).toBe(legacy);
  });

  it('round-trips what checkout writes', () => {
    const [day] = build(TUESDAY_11AM_PT);
    const written = `${day.slots[0].id}${PICKUP_LOCATION_SEPARATOR}${address}`;
    expect(formatPickupLocation(written)).toBe(
      `Tue Jul 28 · 12:00 PM – 1:00 PM${PICKUP_LOCATION_SEPARATOR}${address}`,
    );
  });
});
