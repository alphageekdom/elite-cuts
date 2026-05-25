import { describe, expect, it } from 'vitest';

import type { PointsHistoryEntry } from '@/models/User';
import {
  addMonths,
  applyRedemption,
  computeAward,
  computeRedemption,
  computeRedemptionCap,
  getQualifyingPoints,
  getTier,
  getTierView,
  tierRank,
} from './calculator';

// Real ShopSettings has many more fields, but every rewards function takes
// a Pick<ShopSettings, …> slice — so a structural test object that lists
// every key any rewards helper might read is compatible with all of them
// via TypeScript's structural typing.
type TestSettings = {
  pointsPerDollar: number;
  weekendMultiplier: number;
  redemptionPoints: number;
  redemptionDollars: number;
  minToRedeem: number;
  maxRedemptionPercent: number;
  maxRedemptionDollars: number;
  connoisseurThreshold: number;
  masterCutThreshold: number;
  tierWindowMonths: number;
  pointsExpiryMonths: number;
};

const settings = (overrides: Partial<TestSettings> = {}): TestSettings => ({
  pointsPerDollar: 1,
  weekendMultiplier: 2,
  redemptionPoints: 100,
  redemptionDollars: 5,
  minToRedeem: 100,
  maxRedemptionPercent: 100,
  maxRedemptionDollars: 0,
  connoisseurThreshold: 1000,
  masterCutThreshold: 5000,
  tierWindowMonths: 0,
  pointsExpiryMonths: 12,
  ...overrides,
});

// Known UTC weekday anchors used across multiple tests. Verified manually:
// 2026-05-15 is a Friday, 2026-05-16 is a Saturday, 2026-05-17 is a Sunday.
const FRIDAY = new Date('2026-05-15T12:00:00.000Z');
const SATURDAY = new Date('2026-05-16T12:00:00.000Z');
const SUNDAY = new Date('2026-05-17T12:00:00.000Z');

describe('tierRank', () => {
  it('orders regular < connoisseur < masterCut', () => {
    expect(tierRank('regular')).toBeLessThan(tierRank('connoisseur'));
    expect(tierRank('connoisseur')).toBeLessThan(tierRank('masterCut'));
  });
});

describe('addMonths', () => {
  it('adds N calendar months', () => {
    const start = new Date('2026-01-15T00:00:00.000Z');
    const six = addMonths(start, 6);
    expect(six.getUTCMonth()).toBe(6); // July (0-indexed)
  });

  it('rolls over a year boundary', () => {
    const start = new Date('2026-11-15T00:00:00.000Z');
    const three = addMonths(start, 3);
    expect(three.getUTCFullYear()).toBe(2027);
  });
});

describe('computeAward', () => {
  it('returns 0 for zero or negative subtotal', () => {
    expect(computeAward(0, settings(), FRIDAY)).toBe(0);
    expect(computeAward(-10, settings(), FRIDAY)).toBe(0);
  });

  it('returns floor(subtotal * pointsPerDollar) on a weekday', () => {
    // $24.50 * 1 pt/$ = 24 pts (floored)
    expect(computeAward(24.5, settings({ pointsPerDollar: 1 }), FRIDAY)).toBe(24);
  });

  it('applies the weekend multiplier on Saturday', () => {
    // $10 * 1 pt/$ * 2× weekend = 20 pts
    expect(computeAward(10, settings({ weekendMultiplier: 2 }), SATURDAY)).toBe(20);
  });

  it('applies the weekend multiplier on Sunday', () => {
    expect(computeAward(10, settings({ weekendMultiplier: 2 }), SUNDAY)).toBe(20);
  });

  it('treats sub-1 weekend multipliers as 1× (no penalty)', () => {
    // Misconfigured settings.weekendMultiplier of 0.5 shouldn't drop the
    // base rate — Math.max(1, ...) clamps the floor.
    expect(computeAward(10, settings({ weekendMultiplier: 0.5 }), SATURDAY)).toBe(10);
  });
});

describe('computeRedemption', () => {
  it('converts whole blocks to cents', () => {
    // 100 pts = $5 → 500 cents
    expect(computeRedemption(100, settings())).toBe(500);
    expect(computeRedemption(300, settings())).toBe(1500);
  });

  it('returns 0 for non-positive points', () => {
    expect(computeRedemption(0, settings())).toBe(0);
    expect(computeRedemption(-50, settings())).toBe(0);
  });
});

describe('computeRedemptionCap', () => {
  it('caps at percent of subtotal when flat is 0 (no flat ceiling)', () => {
    // 25% of $40 = $10
    const cap = computeRedemptionCap(40, settings({
      maxRedemptionPercent: 25,
      maxRedemptionDollars: 0,
    }));
    expect(cap.capDollars).toBe(10);
    expect(cap.capCents).toBe(1000);
  });

  it('uses the lower of percent and flat when both are set', () => {
    // 50% of $100 = $50, but flat ceiling is $20 → cap = $20
    const cap = computeRedemptionCap(100, settings({
      maxRedemptionPercent: 50,
      maxRedemptionDollars: 20,
    }));
    expect(cap.capDollars).toBe(20);
  });

  it('clamps the percent at 100 if misconfigured', () => {
    const cap = computeRedemptionCap(50, settings({
      maxRedemptionPercent: 999,
      maxRedemptionDollars: 0,
    }));
    expect(cap.capDollars).toBe(50);
  });
});

describe('applyRedemption', () => {
  const base = (over: Partial<Parameters<typeof applyRedemption>[0]> = {}) => ({
    pointsToRedeem: 200,
    currentBalance: 500,
    settings: settings({ redemptionPoints: 100, redemptionDollars: 5, minToRedeem: 100 }),
    orderSubtotalDollars: 50,
    ...over,
  });

  it('returns valid result on happy path', () => {
    const result = applyRedemption(base());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.pointsUsed).toBe(200);
      expect(result.valueCents).toBe(1000); // 200 pts → $10
      expect(result.newBalance).toBe(300);
    }
  });

  it('rejects when balance is insufficient', () => {
    const result = applyRedemption(base({ pointsToRedeem: 1000, currentBalance: 100 }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/Not enough points/);
  });

  it('rejects below minimum-to-redeem threshold', () => {
    const result = applyRedemption(base({ pointsToRedeem: 50 }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/Minimum/);
  });

  it('rejects non-integer points', () => {
    const result = applyRedemption(base({ pointsToRedeem: 200.5 }));
    expect(result.valid).toBe(false);
  });

  it('rounds down to the nearest block (250 pts redeems as 200)', () => {
    const result = applyRedemption(base({ pointsToRedeem: 250 }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.pointsUsed).toBe(200);
      expect(result.newBalance).toBe(300);
    }
  });

  it('enforces the per-order cap when subtotal is provided', () => {
    // 25% of $20 = $5 cap; 200 pts would redeem as $10 → rejected
    const result = applyRedemption(base({
      orderSubtotalDollars: 20,
      settings: settings({
        redemptionPoints: 100,
        redemptionDollars: 5,
        minToRedeem: 100,
        maxRedemptionPercent: 25,
        maxRedemptionDollars: 0,
      }),
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/per-order cap/);
  });

  it('skips the per-order cap when subtotal is omitted', () => {
    const result = applyRedemption(base({ orderSubtotalDollars: undefined }));
    expect(result.valid).toBe(true);
  });
});

describe('getTier', () => {
  const s = settings({ connoisseurThreshold: 1000, masterCutThreshold: 5000 });

  it('returns regular below the connoisseur threshold', () => {
    expect(getTier(0, s).tier).toBe('regular');
    expect(getTier(999, s).tier).toBe('regular');
  });

  it('returns connoisseur between thresholds', () => {
    expect(getTier(1000, s).tier).toBe('connoisseur');
    expect(getTier(4999, s).tier).toBe('connoisseur');
  });

  it('returns masterCut at and above the top threshold', () => {
    expect(getTier(5000, s).tier).toBe('masterCut');
    expect(getTier(50000, s).tier).toBe('masterCut');
  });

  it('reports progress within the current band', () => {
    // 500 / 1000 → 0.5 toward connoisseur
    expect(getTier(500, s).progress).toBeCloseTo(0.5);
    // masterCut → progress is 1
    expect(getTier(10000, s).progress).toBe(1);
  });
});

describe('getQualifyingPoints', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const now = new Date('2026-12-31T00:00:00.000Z');

  it('sums positive order_fulfilled entries inside the window', () => {
    const history: PointsHistoryEntry[] = [
      { delta: 100, reason: 'order_fulfilled', createdAt: new Date('2026-03-01') },
      { delta: 200, reason: 'order_fulfilled', createdAt: new Date('2026-06-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(300);
  });

  it('excludes entries outside the window', () => {
    const history: PointsHistoryEntry[] = [
      { delta: 100, reason: 'order_fulfilled', createdAt: new Date('2025-12-01') },
      { delta: 200, reason: 'order_fulfilled', createdAt: new Date('2026-06-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(200);
  });

  it('subtracts cancel/refund reversals inside the window', () => {
    const history: PointsHistoryEntry[] = [
      { delta: 500, reason: 'order_fulfilled', createdAt: new Date('2026-03-01') },
      { delta: -200, reason: 'refund_reverse', createdAt: new Date('2026-04-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(300);
  });

  it('ignores redemption entries', () => {
    const history: PointsHistoryEntry[] = [
      { delta: 500, reason: 'order_fulfilled', createdAt: new Date('2026-03-01') },
      { delta: -200, reason: 'redemption', createdAt: new Date('2026-04-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(500);
  });

  it('floors at 0 (never returns negative)', () => {
    const history: PointsHistoryEntry[] = [
      { delta: 100, reason: 'order_fulfilled', createdAt: new Date('2026-03-01') },
      { delta: -500, reason: 'cancel_reverse', createdAt: new Date('2026-04-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(0);
  });
});

describe('getTierView (rolling window)', () => {
  it('falls back to lifetime-based tier when windowMonths = 0', () => {
    const view = getTierView(
      { lifetimePoints: 1500, createdAt: new Date('2026-01-01') },
      settings({ tierWindowMonths: 0 }),
      new Date('2026-06-01'),
    );
    expect(view.tier).toBe('connoisseur');
    expect(view.reassessed).toBe(false);
    expect(view.periodEndsAt).toBeNull();
  });

  it('mid-period: surfaces the higher of cached tier and currently-earned tier', () => {
    // Cached as connoisseur but only 100 pts this period → still connoisseur
    const pointsHistory: PointsHistoryEntry[] = [
      { delta: 100, reason: 'order_fulfilled', createdAt: new Date('2026-03-01') },
    ];
    const view = getTierView(
      {
        createdAt: new Date('2026-01-01'),
        tierAnniversaryAt: new Date('2026-01-01'),
        currentTier: 'connoisseur',
        pointsHistory,
      },
      settings({ tierWindowMonths: 12 }),
      new Date('2026-06-01'),
    );
    expect(view.tier).toBe('connoisseur');
    expect(view.qualifying).toBe(100);
    expect(view.reassessed).toBe(false);
  });

  it('reassesses on the anniversary using the just-ended period', () => {
    const anniversary = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2027-02-01T00:00:00.000Z'); // past the 12mo window
    // 1500 pts earned during the closed period → should drop to connoisseur
    const pointsHistory: PointsHistoryEntry[] = [
      { delta: 1500, reason: 'order_fulfilled', createdAt: new Date('2026-06-01') },
    ];
    const view = getTierView(
      {
        createdAt: anniversary,
        tierAnniversaryAt: anniversary,
        currentTier: 'masterCut', // cached high
        pointsHistory,
      },
      settings({ tierWindowMonths: 12, connoisseurThreshold: 1000, masterCutThreshold: 5000 }),
      now,
    );
    expect(view.tier).toBe('connoisseur');
    expect(view.reassessed).toBe(true);
    expect(view.qualifying).toBe(0); // fresh period
    expect(view.periodStart.getTime()).toBe(now.getTime());
  });
});
