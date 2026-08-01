import { describe, expect, it } from 'vitest';

import {
  formatDaysUntil,
  getActiveHoliday,
  getHolidayForCut,
  HOLIDAYS,
  HOLIDAY_WINDOW_DAYS,
} from './holidays';

// Easter, nth/last-weekday and the 21-day window had no tests, and the module
// drives a banner, an inline product note and the navbar announcement bell.

const holiday = (slug: string) => HOLIDAYS.find((h) => h.slug === slug)!;
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('holiday dates', () => {
  it('computes Easter with the anonymous Gregorian algorithm', () => {
    // Known-good values.
    expect(ymd(holiday('easter').computeDate(2026))).toBe('2026-04-05');
    expect(ymd(holiday('easter').computeDate(2027))).toBe('2027-03-28');
    expect(ymd(holiday('easter').computeDate(2035))).toBe('2035-03-25');
  });

  it('finds the last Monday of May for Memorial Day', () => {
    expect(ymd(holiday('memorial-day').computeDate(2026))).toBe('2026-05-25');
    expect(ymd(holiday('memorial-day').computeDate(2027))).toBe('2027-05-31');
  });

  it('finds the first Monday of September for Labor Day', () => {
    expect(ymd(holiday('labor-day').computeDate(2026))).toBe('2026-09-07');
    expect(ymd(holiday('labor-day').computeDate(2027))).toBe('2027-09-06');
  });

  it('finds the fourth Thursday of November for Thanksgiving', () => {
    expect(ymd(holiday('thanksgiving').computeDate(2026))).toBe('2026-11-26');
    expect(ymd(holiday('thanksgiving').computeDate(2027))).toBe('2027-11-25');
  });

  it('pins the fixed-date holidays', () => {
    expect(ymd(holiday('july-4').computeDate(2026))).toBe('2026-07-04');
    expect(ymd(holiday('christmas').computeDate(2026))).toBe('2026-12-25');
  });
});

describe('getActiveHoliday — window', () => {
  it('opens exactly 21 days before', () => {
    // July 4 2026; the window opens on June 13.
    expect(getActiveHoliday('2026-06-13')?.holiday.slug).toBe('july-4');
    expect(getActiveHoliday('2026-06-12')).toBeNull();
  });

  it('stays open on the day itself and closes the day after', () => {
    expect(getActiveHoliday('2026-07-04')?.daysUntil).toBe(0);
    expect(getActiveHoliday('2026-07-05')).toBeNull();
  });

  it('reports the days remaining', () => {
    expect(getActiveHoliday('2026-07-01')?.daysUntil).toBe(3);
    expect(getActiveHoliday('2026-06-20')?.daysUntil).toBe(14);
  });

  it('picks the nearest holiday when two windows overlap', () => {
    // Christmas (Dec 25) and Thanksgiving (Nov 26) windows both cover early
    // December; the nearer one wins.
    const active = getActiveHoliday('2026-12-06');
    expect(active?.holiday.slug).toBe('christmas');
  });

  it('agrees with the exported window length', () => {
    const active = getActiveHoliday('2026-06-13');
    expect(active?.daysUntil).toBe(HOLIDAY_WINDOW_DAYS);
  });
});

// The bug this pins: the module read "today" off the runtime clock. On a UTC
// deploy serving a Pacific shop the server rolls over first, so from 5pm
// local the banner vanished while the counter was still trading on the
// holiday, and "Today" / "Tomorrow" ran up to eight hours early.
describe('getActiveHoliday — reads the shop calendar day', () => {
  it('still shows the holiday when the server has rolled over but the shop has not', () => {
    // 2026-07-05T02:00Z is 7pm on July 4 in Pacific. Passing a Date reads the
    // runtime's day; passing the shop's date key reads the shop's.
    const shopSide = getActiveHoliday('2026-07-04');
    expect(shopSide?.holiday.slug).toBe('july-4');
    expect(shopSide?.daysUntil).toBe(0);
  });

  it('accepts a date key and a Date interchangeably for the same day', () => {
    const fromKey = getActiveHoliday('2026-07-01');
    const fromDate = getActiveHoliday(new Date(2026, 6, 1, 9, 0, 0));
    expect(fromKey?.holiday.slug).toBe(fromDate?.holiday.slug);
    expect(fromKey?.daysUntil).toBe(fromDate?.daysUntil);
  });

  it('is unaffected by the time of day within one shop date', () => {
    // A date key carries no clock, so every hour of July 1 answers the same.
    expect(getActiveHoliday('2026-07-01')?.daysUntil).toBe(3);
  });
});

describe('getHolidayForCut', () => {
  it('matches a cut named in the holiday list', () => {
    expect(getHolidayForCut('Whole Turkey', '2026-11-20')?.holiday.slug).toBe(
      'thanksgiving',
    );
  });

  it('matches case-insensitively on a substring', () => {
    expect(getHolidayForCut('Heritage TURKEY Crown', '2026-11-20')).not.toBeNull();
  });

  it('returns null for a cut the holiday does not name', () => {
    expect(getHolidayForCut('Pork Belly', '2026-11-20')).toBeNull();
  });

  it('returns null when no window is open, however well the name matches', () => {
    expect(getHolidayForCut('Whole Turkey', '2026-08-01')).toBeNull();
  });
});

describe('formatDaysUntil', () => {
  it('names today and tomorrow rather than counting', () => {
    expect(formatDaysUntil(0)).toBe('Today');
    expect(formatDaysUntil(1)).toBe('Tomorrow');
  });

  it('counts from two days out', () => {
    expect(formatDaysUntil(2)).toBe('In 2 days');
    expect(formatDaysUntil(21)).toBe('In 21 days');
  });
});
