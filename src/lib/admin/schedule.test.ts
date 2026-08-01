import { describe, expect, it } from 'vitest';

import {
  buildDayCells,
  buildWeekRangeLabel,
  buildWeekStartParts,
  buildTodayDateLabel,
  toMondayIndex,
} from './schedule';
import { mondayOfShopDay } from '@/lib/shifts/schedule';

// These helpers had no tests at all, which is how a regression reached the
// schedule grid: `weekStart` moved from a browser-local midnight to UTC
// midnight (to fix shifts storing under a Sunday key east of UTC) and the
// three display sites kept reading it with LOCAL getters. On a Pacific
// browser the header then read "Week of Aug 2" — a Sunday — over day cells
// numbered 2..8, while the UTC server rendered 3..9 into the same page.
//
// Every assertion below is written against the calendar date the key encodes,
// so it holds in any runtime zone — but it only DISCRIMINATES west of UTC.
// Under UTC the local and UTC getters agree, and east of UTC a UTC-midnight
// value still reads as the same calendar day, so the pre-fix implementations
// produce byte-identical output and every assertion here passes with the bug
// restored. Measured: reverting the getters fails 6 of these under
// `America/Los_Angeles` and 0 under both `UTC` and `Australia/Sydney`.
//
// So the west-of-UTC default pinned in vitest.config.ts, and the Pacific leg of
// `npm run test:tz`, are load-bearing rather than incidental. Removing either
// leaves this file green against the exact regression it was written for.

const MONDAY = mondayOfShopDay('2026-08-05'); // the Wednesday of that week
const OPEN_ALL_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isClosed: false,
  opensAt: '8:00 AM',
  closesAt: '6:00 PM',
}));

describe('weekStart is a UTC-midnight calendar value', () => {
  it('resolves to the Monday of the given shop day', () => {
    expect(MONDAY.toISOString()).toBe('2026-08-03T00:00:00.000Z');
  });
});

describe('buildWeekStartParts', () => {
  it('names the Monday itself, not the day before it', () => {
    // Reading this with `getMonth()`/`getDate()` yields Aug 2 anywhere west
    // of UTC — the exact header regression.
    expect(buildWeekStartParts(MONDAY)).toEqual({ month: 'Aug', day: 3 });
  });

  it('holds across a month boundary', () => {
    // Week of Mon 29 Jun 2026 — a local read would say Jun 28.
    expect(buildWeekStartParts(mondayOfShopDay('2026-07-01'))).toEqual({
      month: 'Jun',
      day: 29,
    });
  });
});

describe('buildDayCells', () => {
  it('numbers Monday through Sunday from the week start', () => {
    const cells = buildDayCells(MONDAY, OPEN_ALL_WEEK, 0);
    expect(cells.map((c) => c.date)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(cells.map((c) => c.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('rolls into the next month without skipping a day', () => {
    // Week of Mon 29 Jun 2026 runs 29, 30, then 1..5 July.
    const cells = buildDayCells(mondayOfShopDay('2026-07-01'), OPEN_ALL_WEEK, 0);
    expect(cells.map((c) => c.date)).toEqual([29, 30, 1, 2, 3, 4, 5]);
  });

  it('marks today from the index it is given, not from the clock', () => {
    const cells = buildDayCells(MONDAY, OPEN_ALL_WEEK, 2);
    expect(cells.filter((c) => c.isToday).map((c) => c.label)).toEqual(['Wed']);
  });

  it('reads each day closed flag by its own index', () => {
    const mondayClosed = OPEN_ALL_WEEK.map((h) =>
      h.dayOfWeek === 0 ? { ...h, isClosed: true } : h,
    );
    expect(buildDayCells(MONDAY, mondayClosed, 0).map((c) => c.closed)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('buildWeekRangeLabel', () => {
  it('brackets the week from its Monday to its Sunday', () => {
    expect(buildWeekRangeLabel(MONDAY)).toBe('AUG 3 – AUG 9, 2026');
  });

  it('carries the end year across a year boundary', () => {
    // Week of Mon 28 Dec 2026 ends 3 Jan 2027.
    expect(buildWeekRangeLabel(mondayOfShopDay('2026-12-30'))).toBe(
      'DEC 28 – JAN 3, 2027',
    );
  });
});

describe('buildTodayDateLabel', () => {
  it('names the weekday of the shop date key', () => {
    expect(buildTodayDateLabel('2026-08-05')).toEqual({
      dayName: 'Wednesday',
      dateStr: 'Aug 5',
    });
  });

  it('is unaffected by the runtime zone', () => {
    // A date key carries no instant, so there is no clock to read it against.
    expect(buildTodayDateLabel('2026-01-01').dayName).toBe('Thursday');
  });
});

describe('toMondayIndex', () => {
  it('remaps Sunday-indexed getDay() onto the schedule Monday order', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toMondayIndex)).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
});
