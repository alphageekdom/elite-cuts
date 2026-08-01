import { describe, expect, it } from 'vitest';

import { currentWeekStartUtc } from './shifts';

// The nightly restore replaces the whole shift roster and keys it to one week.
// Every surface that renders that week derives it from the SHOP's calendar day
// (`shopDateKey`), so the restore has to agree — it used to read the server's
// instead. On a UTC deploy serving a Pacific shop the two disagree from 5pm
// local, and a Sunday-evening reset planted the entire roster in the following
// week: the grid, the "On today" card and the staff Today column all rendered
// empty until shop-Monday.

// 2026-08-03T01:00Z is Sunday 2 Aug, 6pm in Los Angeles — and already Monday
// 3 Aug, 11am in Sydney. One instant, two different weeks.
const INSTANT = new Date('2026-08-03T01:00:00Z');

describe('currentWeekStartUtc', () => {
  it('follows the shop into the previous week when the shop is still on Sunday', () => {
    // Sunday belongs to the week that began Monday 27 July.
    expect(currentWeekStartUtc('America/Los_Angeles (PT)', INSTANT).toISOString()).toBe(
      '2026-07-27T00:00:00.000Z',
    );
  });

  it('follows the shop into the new week when the shop has already rolled over', () => {
    expect(currentWeekStartUtc('Australia/Sydney', INSTANT).toISOString()).toBe(
      '2026-08-03T00:00:00.000Z',
    );
  });

  it('returns a different week for the same instant in the two zones', () => {
    // States the property directly: the answer depends on the shop's zone, not
    // the runtime's. A regression to a server-clock read collapses these.
    expect(currentWeekStartUtc('America/Los_Angeles (PT)', INSTANT)).not.toEqual(
      currentWeekStartUtc('Australia/Sydney', INSTANT),
    );
  });

  it('always lands on a Monday at UTC midnight', () => {
    // The shift API and the unique (weekStart, dayOfWeek, hourIndex) index both
    // assume this exact shape, so a restore that drifted off it would insert
    // rows the grid could never find.
    for (const zone of ['America/Los_Angeles (PT)', 'Australia/Sydney', 'UTC']) {
      const key = currentWeekStartUtc(zone, INSTANT);
      expect(key.getUTCDay()).toBe(1);
      expect(key.toISOString()).toMatch(/T00:00:00\.000Z$/);
    }
  });
});
