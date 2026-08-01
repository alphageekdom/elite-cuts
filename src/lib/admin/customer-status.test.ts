import { describe, expect, it } from 'vitest';

import {
  countByStat,
  matchesStatFilter,
  NINETY_DAYS_MS,
  THIRTY_DAYS_MS,
  type CustomerStatusInput,
} from './customer-status';

// The stat chips above the customers table are FILTERS, and their numbers come
// from `countByStat` while the rows come from `matchesStatFilter`. The two had
// drifted: counting stripped demo accounts, filtering never did, so the strip
// read "All 5" above six rows. The last block below is the real guard — it
// asserts the two agree for every filter rather than testing each in isolation.

const NOW = Date.UTC(2026, 6, 31);
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000);

const customer = (over: Partial<CustomerStatusInput> = {}): CustomerStatusInput => ({
  createdAt: daysAgo(400),
  lastOrderAt: null,
  orderCount: 0,
  ...over,
});

describe('matchesStatFilter', () => {
  it('matches everything under "all"', () => {
    expect(matchesStatFilter(customer(), 'all', NOW)).toBe(true);
  });

  it('counts a signup inside the last 30 days as new', () => {
    expect(matchesStatFilter(customer({ createdAt: daysAgo(29) }), 'new', NOW)).toBe(true);
    expect(matchesStatFilter(customer({ createdAt: daysAgo(31) }), 'new', NOW)).toBe(false);
  });

  it('counts an order inside the last 90 days as active', () => {
    expect(matchesStatFilter(customer({ lastOrderAt: daysAgo(89) }), 'active', NOW)).toBe(true);
    expect(matchesStatFilter(customer({ lastOrderAt: daysAgo(91) }), 'active', NOW)).toBe(false);
    // Never ordered is not active, however recently they joined.
    expect(matchesStatFilter(customer({ createdAt: daysAgo(1) }), 'active', NOW)).toBe(false);
  });

  it('treats ten orders as the connoisseur cutoff', () => {
    expect(matchesStatFilter(customer({ orderCount: 10 }), 'connoisseurPlus', NOW)).toBe(true);
    expect(matchesStatFilter(customer({ orderCount: 9 }), 'connoisseurPlus', NOW)).toBe(false);
  });

  it('counts a warned account as dormant only until it is deleted', () => {
    const warned = { dormancyWarnedAt: daysAgo(5) };
    expect(matchesStatFilter(customer(warned), 'dormant', NOW)).toBe(true);
    expect(
      matchesStatFilter(customer({ ...warned, deletedAt: daysAgo(1) }), 'dormant', NOW),
    ).toBe(false);
  });

  it('ignores an unparseable date rather than throwing', () => {
    expect(matchesStatFilter(customer({ lastOrderAt: 'not a date' }), 'active', NOW)).toBe(false);
  });
});

describe('countByStat agrees with the filter the table runs', () => {
  // A mixed roster, including a demo account — the row that exposed the drift.
  const roster: (CustomerStatusInput & { isDemo?: boolean })[] = [
    customer({ createdAt: daysAgo(2), lastOrderAt: daysAgo(1), orderCount: 12 }),
    customer({ createdAt: daysAgo(200), lastOrderAt: daysAgo(10), orderCount: 3 }),
    customer({ createdAt: daysAgo(500), lastOrderAt: daysAgo(300), orderCount: 1 }),
    customer({ createdAt: daysAgo(400), dormancyWarnedAt: daysAgo(3) }),
    { ...customer({ createdAt: daysAgo(1), orderCount: 0 }), isDemo: true },
  ];

  it('counts every row the table shows, demo included', () => {
    // The chips label a filter over this exact list. A demo account renders as
    // a row (with a Demo pill), so a count that skipped it described nothing on
    // screen. Real-customer metrics live on the dashboard, which filters
    // `isDemo` at the query instead.
    expect(countByStat(roster, NOW).all).toBe(roster.length);
  });

  it.each(['new', 'active', 'connoisseurPlus', 'dormant'] as const)(
    'the "%s" chip count equals the rows that filter yields',
    (filter) => {
      const counts = countByStat(roster, NOW);
      const rows = roster.filter((r) => matchesStatFilter(r, filter, NOW));
      expect(counts[filter]).toBe(rows.length);
    },
  );

  it('is zero across the board for an empty roster', () => {
    expect(countByStat([], NOW)).toEqual({
      all: 0,
      new: 0,
      active: 0,
      connoisseurPlus: 0,
      dormant: 0,
    });
  });
});

describe('window constants', () => {
  it('holds the windows the copy quotes', () => {
    expect(THIRTY_DAYS_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(NINETY_DAYS_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });
});
