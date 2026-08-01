import { describe, expect, it } from 'vitest';

import {
  buildRangeBuckets,
  parseOptionalRange,
  parseRange,
  RANGE_BUCKETS,
  RANGE_DAYS,
} from './range-buckets';

// Bucketing feeds the revenue chart on the dashboard home AND the analytics
// page, plus the orders CSV export's range scoping — and had no tests.

const source = (daysAgo: number, totalCost: number, now: Date) => ({
  createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  totalCost,
});

describe('parseRange', () => {
  it('defaults to 30D on absent or unknown input', () => {
    expect(parseRange(null)).toBe('30D');
    expect(parseRange(undefined)).toBe('30D');
    expect(parseRange('')).toBe('30D');
    expect(parseRange('nonsense')).toBe('30D');
  });

  it('accepts every allowed range, case-insensitively', () => {
    expect(parseRange('7d')).toBe('7D');
    expect(parseRange('30D')).toBe('30D');
    expect(parseRange('90d')).toBe('90D');
    expect(parseRange('1y')).toBe('1Y');
  });
});

describe('parseOptionalRange', () => {
  it('distinguishes "no filter" from the default', () => {
    expect(parseOptionalRange(null)).toBeNull();
    expect(parseOptionalRange('nonsense')).toBeNull();
    expect(parseOptionalRange('90D')).toBe('90D');
  });
});

describe('buildRangeBuckets — shape', () => {
  const now = new Date('2026-07-30T12:00:00.000Z');

  it('emits the configured bucket count for every range', () => {
    for (const range of ['7D', '30D', '90D', '1Y'] as const) {
      expect(buildRangeBuckets(range, now, [], [])).toHaveLength(
        RANGE_BUCKETS[range].count,
      );
    }
  });

  it('puts an order in the bucket whose window contains it', () => {
    const buckets = buildRangeBuckets(
      '7D',
      now,
      [source(0.5, 100, now), source(3.5, 40, now)],
      [],
    );
    const withValue = buckets.filter((b) => b.value > 0);
    expect(withValue).toHaveLength(2);
    expect(withValue.map((b) => b.value).sort((a, b) => a - b)).toEqual([40, 100]);
  });

  it('reads the previous period from the second list', () => {
    const buckets = buildRangeBuckets(
      '7D',
      now,
      [],
      [source(RANGE_DAYS['7D'] + 0.5, 75, now)],
    );
    expect(buckets.reduce((s, b) => s + b.prevValue, 0)).toBe(75);
    expect(buckets.reduce((s, b) => s + b.value, 0)).toBe(0);
  });

  it('ignores anything outside the window', () => {
    const buckets = buildRangeBuckets('7D', now, [source(30, 999, now)], []);
    expect(buckets.every((b) => b.value === 0)).toBe(true);
  });
});

describe('buildRangeBuckets — labels', () => {
  const now = new Date('2026-07-30T12:00:00.000Z');

  it('labels 7D by weekday', () => {
    const labels = buildRangeBuckets('7D', now, [], []).map((b) => b.label);
    expect(labels).toHaveLength(7);
    for (const label of labels) {
      expect(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']).toContain(label);
    }
  });

  it('labels 30D by week number, counting up', () => {
    expect(buildRangeBuckets('30D', now, [], []).map((b) => b.label)).toEqual([
      'WK 1',
      'WK 2',
      'WK 3',
      'WK 4',
      'WK 5',
    ]);
  });

  // The bug this pins: the 1Y branch printed a bare month name over 30-day
  // strides, which don't line up with calendar months. A year ending 30 July
  // read "Aug Sep Oct Nov Dec Jan Jan Mar Apr May May Jun" — January and May
  // twice, February missing altogether.
  it('never repeats or skips a 1Y label', () => {
    const labels = buildRangeBuckets('1Y', now, [], []).map((b) => b.label);
    expect(labels).toHaveLength(12);
    expect(new Set(labels).size).toBe(12);
  });

  it('labels 1Y buckets with a month and day, in order', () => {
    const labels = buildRangeBuckets('1Y', now, [], []).map((b) => b.label);
    for (const label of labels) {
      expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
  });

  it('labels 90D buckets the same way, and distinctly', () => {
    const labels = buildRangeBuckets('90D', now, [], []).map((b) => b.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) {
      expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
  });

  it('produces distinct labels across a year boundary too', () => {
    const newYear = new Date('2027-01-15T12:00:00.000Z');
    const labels = buildRangeBuckets('1Y', newYear, [], []).map((b) => b.label);
    expect(new Set(labels).size).toBe(12);
  });
});
