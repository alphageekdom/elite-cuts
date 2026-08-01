import { describe, expect, it } from 'vitest';

import { mondayOfShopDay } from './schedule';

// The bug these pin: the week key used to come from `getMondayOf(new Date())`
// — local-midnight Monday — snapped to its UTC calendar date. That only holds
// west of UTC. For any client east of it, local-midnight Monday is still
// Sunday in UTC terms, so shifts stored under a SUNDAY key: invisible to the
// server-rendered grid (which queries Monday-keyed weeks), and split across
// two keys for the same visible cell, which defeated both the collision check
// and the unique (weekStart, dayOfWeek, hourIndex) index meant to stop
// double-booking.
//
// Deriving from a calendar date instead makes the key zone-proof by
// construction: same date string in, same key out, from any runtime.

const iso = (d: Date) => d.toISOString();

describe('mondayOfShopDay', () => {
  it('returns UTC midnight of that week Monday', () => {
    // 2026-05-13 is a Wednesday.
    expect(iso(mondayOfShopDay('2026-05-13'))).toBe('2026-05-11T00:00:00.000Z');
  });

  it('maps every day of one week to the same Monday', () => {
    const week = [
      '2026-05-11', // Mon
      '2026-05-12',
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
      '2026-05-16',
      '2026-05-17', // Sun
    ];
    const keys = new Set(week.map((d) => iso(mondayOfShopDay(d))));
    expect([...keys]).toEqual(['2026-05-11T00:00:00.000Z']);
  });

  it('treats Sunday as the END of its week, not the start', () => {
    // The `day === 0 ? -6` branch — Sunday belongs to the Monday six days back.
    expect(iso(mondayOfShopDay('2026-05-17'))).toBe('2026-05-11T00:00:00.000Z');
    expect(iso(mondayOfShopDay('2026-05-18'))).toBe('2026-05-18T00:00:00.000Z');
  });

  it('rolls across a month boundary', () => {
    // 2026-06-02 is a Tuesday; its Monday is in May.
    expect(iso(mondayOfShopDay('2026-06-02'))).toBe('2026-06-01T00:00:00.000Z');
    // 2026-03-01 is a Sunday → Monday 2026-02-23.
    expect(iso(mondayOfShopDay('2026-03-01'))).toBe('2026-02-23T00:00:00.000Z');
  });

  it('rolls across a year boundary', () => {
    // 2027-01-01 is a Friday → Monday 2026-12-28.
    expect(iso(mondayOfShopDay('2027-01-01'))).toBe('2026-12-28T00:00:00.000Z');
  });

  it('is midnight exactly, so the unique index can match on equality', () => {
    const monday = mondayOfShopDay('2026-05-13');
    expect(monday.getUTCHours()).toBe(0);
    expect(monday.getUTCMinutes()).toBe(0);
    expect(monday.getUTCSeconds()).toBe(0);
    expect(monday.getUTCMilliseconds()).toBe(0);
  });
});

// `localDateKey` used to live here, deriving a date key from the runtime's own
// clock. Every caller has been converted to `shopDateKey`, because a week key
// read off the server (or the browser) disagrees with the shop's for the hours
// either side of shop-midnight — which put shifts under keys nothing queried.
// The function was deleted rather than left available: it had no correct use
// left, and the two bugs it caused both came from reaching for it.
