import { describe, expect, it } from 'vitest';

import type { PointsHistoryEntry } from '@/models/User';
import {
  addMonths,
  applyRedemption,
  computeAward,
  computeRedemption,
  computeRedemptionCap,
  describeRedemptionCap,
  getQualifyingPoints,
  getTier,
  getTierView,
  projectRewards,
  creditableReturn,
  redeemableValueDollars,
  splitRedemptionAgainstBalance,
  tierLabel,
  tierRank,
  tierViewToInfo,
} from './calculator';

// Real ShopSettings has many more fields, but every rewards function takes
// a Pick<ShopSettings, …> slice — so a structural test object that lists
// every key any rewards helper might read is compatible with all of them
// via TypeScript's structural typing.
type TestSettings = {
  pointsPerDollar: number;
  weekendMultiplier: number;
  // Required by `computeAward` since 2026-08-03 — deliberately not optional, so
  // a caller that forgets it fails to compile rather than silently resuming the
  // server clock, which is the bug that hid here for months.
  timezone: string;
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
  timezone: 'America/Los_Angeles (PT)',
  ...overrides,
});

// Known UTC weekday anchors used across multiple tests. Verified manually:
// 2026-05-15 is a Friday, 2026-05-16 is a Saturday, 2026-05-17 is a Sunday.
// All three sit at midday UTC, which is early morning Pacific — the same
// calendar day in both zones, so they deliberately do NOT distinguish the two
// clocks. The pair below exists for that.
const FRIDAY = new Date('2026-05-15T12:00:00.000Z');
const SATURDAY = new Date('2026-05-16T12:00:00.000Z');
const SUNDAY = new Date('2026-05-17T12:00:00.000Z');

// The two instants where UTC and the shop disagree about the day. May is PDT
// (UTC-7), so:
//   2026-05-18T02:00Z = Sunday 7:00 PM in San Diego, Monday in UTC
//   2026-05-16T01:00Z = Friday  6:00 PM in San Diego, Saturday in UTC
// These are the exact cases the old `getUTCDay()` got backwards — a Sunday
// evening pickup earning nothing while a Friday evening one earned double.
const SUNDAY_EVENING_SHOP = new Date('2026-05-18T02:00:00.000Z');
const FRIDAY_EVENING_SHOP = new Date('2026-05-16T01:00:00.000Z');

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
    expect(computeAward(24.5, settings({ pointsPerDollar: 1 }), FRIDAY)).toBe(
      24,
    );
  });

  it('applies the weekend multiplier on Saturday', () => {
    // $10 * 1 pt/$ * 2× weekend = 20 pts
    expect(computeAward(10, settings({ weekendMultiplier: 2 }), SATURDAY)).toBe(
      20,
    );
  });

  it('applies the weekend multiplier on Sunday', () => {
    expect(computeAward(10, settings({ weekendMultiplier: 2 }), SUNDAY)).toBe(
      20,
    );
  });

  // The regression these two exist for. Both fail against `getUTCDay()`, and
  // both are silent on the default shop because `weekendMultiplier` is 1 —
  // which is precisely why the bug survived: it has no symptom until an admin
  // raises one dropdown, at which point five surfaces start stating a Sat/Sun
  // claim the arithmetic doesn't honour.
  it('counts Sunday evening at the shop as the weekend, though UTC calls it Monday', () => {
    expect(
      computeAward(10, settings({ weekendMultiplier: 2 }), SUNDAY_EVENING_SHOP),
    ).toBe(20);
  });

  it('does not count Friday evening at the shop as the weekend, though UTC calls it Saturday', () => {
    expect(
      computeAward(10, settings({ weekendMultiplier: 2 }), FRIDAY_EVENING_SHOP),
    ).toBe(10);
  });

  // An unrecognised zone must not throw mid-checkout. `shopWeekdayIndex` falls
  // back to the server's own day, which is the honest degradation: wrong
  // boundary, but an award still lands.
  it('survives an unparseable timezone', () => {
    expect(() =>
      computeAward(10, settings({ timezone: 'Not/AZone' }), SATURDAY),
    ).not.toThrow();
  });

  it('treats sub-1 weekend multipliers as 1× (no penalty)', () => {
    // Misconfigured settings.weekendMultiplier of 0.5 shouldn't drop the
    // base rate — Math.max(1, ...) clamps the floor.
    expect(
      computeAward(10, settings({ weekendMultiplier: 0.5 }), SATURDAY),
    ).toBe(10);
  });

  // The cart drawer shows an earn estimate before the order exists, but the
  // real award lands at fulfillment and applies the multiplier for *that*
  // date. Estimating with the multiplier neutralised keeps the shown number a
  // floor the shop can always honour: browse Saturday with a 2× weekend rate,
  // pick up Monday, and the drawer must not have promised the doubled figure.
  it('yields a floor estimate when the weekend multiplier is neutralised', () => {
    const live = settings({ pointsPerDollar: 1, weekendMultiplier: 2 });
    const neutralised = { ...live, weekendMultiplier: 1 };

    expect(computeAward(100, live, SATURDAY)).toBe(200);
    expect(computeAward(100, neutralised, SATURDAY)).toBe(100);
    // And the floor never exceeds what a weekday fulfillment actually awards.
    expect(computeAward(100, neutralised, SATURDAY)).toBe(
      computeAward(100, live, FRIDAY),
    );
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

describe('redeemableValueDollars', () => {
  // The bug this exists to prevent. The profile displayed the seeded demo
  // balance as "$21 off" using `floor(420 / 100 * 5)`, but `applyRedemption`
  // floors the spend to whole 100-point blocks first, so 420 buys four blocks
  // — $20. The customer could never spend that twenty-first dollar.
  it('floors to whole redemption blocks, not to whole dollars', () => {
    expect(redeemableValueDollars(420, settings())).toBe(20);
  });

  it('agrees with what applyRedemption would actually grant', () => {
    const s = settings({ minToRedeem: 100, maxRedemptionPercent: 100 });
    const result = applyRedemption({
      pointsToRedeem: 420,
      currentBalance: 420,
      settings: s,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.valueCents).toBe(redeemableValueDollars(420, s) * 100);
    }
  });

  it('is zero below a single block', () => {
    expect(redeemableValueDollars(99, settings())).toBe(0);
    expect(redeemableValueDollars(0, settings())).toBe(0);
  });

  it('handles a non-default conversion rate', () => {
    expect(
      redeemableValueDollars(
        250,
        settings({ redemptionPoints: 50, redemptionDollars: 2 }),
      ),
    ).toBe(10);
  });

  it('ignores negative and non-finite balances', () => {
    expect(redeemableValueDollars(-500, settings())).toBe(0);
    expect(redeemableValueDollars(Number.NaN, settings())).toBe(0);
  });
});

describe('describeRedemptionCap', () => {
  it('names both limits when the shop sets both', () => {
    expect(
      describeRedemptionCap({
        maxRedemptionPercent: 50,
        maxRedemptionDollars: 50,
      }),
    ).toBe('up to $50 an order, and never more than 50% of the subtotal');
  });

  it('names only the flat ceiling when the percentage does not bite', () => {
    expect(
      describeRedemptionCap({
        maxRedemptionPercent: 100,
        maxRedemptionDollars: 25,
      }),
    ).toBe('up to $25 an order');
  });

  it('names only the percentage when there is no flat ceiling', () => {
    expect(
      describeRedemptionCap({
        maxRedemptionPercent: 40,
        maxRedemptionDollars: 0,
      }),
    ).toBe("never more than 40% of an order's subtotal");
  });

  // Nothing to disclose is not the same as a cap of zero — the caller drops
  // the clause entirely rather than printing "up to $0 an order".
  it('returns null when the shop caps nothing', () => {
    expect(
      describeRedemptionCap({
        maxRedemptionPercent: 100,
        maxRedemptionDollars: 0,
      }),
    ).toBeNull();
  });
});

describe('computeRedemptionCap', () => {
  it('caps at percent of subtotal when flat is 0 (no flat ceiling)', () => {
    // 25% of $40 = $10
    const cap = computeRedemptionCap(
      40,
      settings({
        maxRedemptionPercent: 25,
        maxRedemptionDollars: 0,
      }),
    );
    expect(cap.capDollars).toBe(10);
    expect(cap.capCents).toBe(1000);
  });

  it('uses the lower of percent and flat when both are set', () => {
    // 50% of $100 = $50, but flat ceiling is $20 → cap = $20
    const cap = computeRedemptionCap(
      100,
      settings({
        maxRedemptionPercent: 50,
        maxRedemptionDollars: 20,
      }),
    );
    expect(cap.capDollars).toBe(20);
  });

  it('clamps the percent at 100 if misconfigured', () => {
    const cap = computeRedemptionCap(
      50,
      settings({
        maxRedemptionPercent: 999,
        maxRedemptionDollars: 0,
      }),
    );
    expect(cap.capDollars).toBe(50);
  });
});

describe('applyRedemption', () => {
  const base = (over: Partial<Parameters<typeof applyRedemption>[0]> = {}) => ({
    pointsToRedeem: 200,
    currentBalance: 500,
    settings: settings({
      redemptionPoints: 100,
      redemptionDollars: 5,
      minToRedeem: 100,
    }),
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
    const result = applyRedemption(
      base({ pointsToRedeem: 1000, currentBalance: 100 }),
    );
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
    const result = applyRedemption(
      base({
        orderSubtotalDollars: 20,
        settings: settings({
          redemptionPoints: 100,
          redemptionDollars: 5,
          minToRedeem: 100,
          maxRedemptionPercent: 25,
          maxRedemptionDollars: 0,
        }),
      }),
    );
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
      {
        delta: 100,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-03-01'),
      },
      {
        delta: 200,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-06-01'),
      },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(300);
  });

  it('excludes entries outside the window', () => {
    const history: PointsHistoryEntry[] = [
      {
        delta: 100,
        reason: 'order_fulfilled',
        createdAt: new Date('2025-12-01'),
      },
      {
        delta: 200,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-06-01'),
      },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(200);
  });

  it('subtracts cancel/refund reversals inside the window', () => {
    const history: PointsHistoryEntry[] = [
      {
        delta: 500,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-03-01'),
      },
      {
        delta: -200,
        reason: 'refund_reverse',
        createdAt: new Date('2026-04-01'),
      },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(300);
  });

  it('ignores redemption entries', () => {
    const history: PointsHistoryEntry[] = [
      {
        delta: 500,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-03-01'),
      },
      { delta: -200, reason: 'redemption', createdAt: new Date('2026-04-01') },
    ];
    expect(getQualifyingPoints(history, start, now)).toBe(500);
  });

  it('floors at 0 (never returns negative)', () => {
    const history: PointsHistoryEntry[] = [
      {
        delta: 100,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-03-01'),
      },
      {
        delta: -500,
        reason: 'cancel_reverse',
        createdAt: new Date('2026-04-01'),
      },
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
      {
        delta: 100,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-03-01'),
      },
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
      {
        delta: 1500,
        reason: 'order_fulfilled',
        createdAt: new Date('2026-06-01'),
      },
    ];
    const view = getTierView(
      {
        createdAt: anniversary,
        tierAnniversaryAt: anniversary,
        currentTier: 'masterCut', // cached high
        pointsHistory,
      },
      settings({
        tierWindowMonths: 12,
        connoisseurThreshold: 1000,
        masterCutThreshold: 5000,
      }),
      now,
    );
    expect(view.tier).toBe('connoisseur');
    expect(view.reassessed).toBe(true);
    expect(view.qualifying).toBe(0); // fresh period
    expect(view.periodStart.getTime()).toBe(now.getTime());
    // Fresh period starts at 0 qualifying, so the whole next-tier threshold
    // is still ahead — pointsToNext must agree with qualifying/progress = 0,
    // not carry over the just-ended period's total.
    expect(view.nextThreshold).toBe(5000);
    expect(view.pointsToNext).toBe(5000);
    expect(view.progress).toBe(0);
  });
});

describe('tierLabel', () => {
  it('names every tier', () => {
    expect(tierLabel('regular')).toBe('Regular');
    expect(tierLabel('connoisseur')).toBe('Connoisseur');
    expect(tierLabel('masterCut')).toBe('Master Cut');
  });
});

describe('tierViewToInfo', () => {
  const config = settings({
    tierWindowMonths: 12,
    connoisseurThreshold: 1000,
    masterCutThreshold: 5000,
  });

  it('fills in the current threshold and next tier a TierView omits', () => {
    const view = getTierView(
      {
        createdAt: new Date('2026-01-01'),
        tierAnniversaryAt: new Date('2026-01-01'),
        currentTier: 'connoisseur',
        pointsHistory: [
          {
            delta: 1200,
            reason: 'order_fulfilled',
            createdAt: new Date('2026-03-01'),
          },
        ],
      },
      config,
      new Date('2026-06-01'),
    );
    const info = tierViewToInfo(view, config);

    expect(info.tier).toBe('connoisseur');
    expect(info.label).toBe('Connoisseur');
    expect(info.threshold).toBe(1000);
    expect(info.nextTier).toBe('masterCut');
    // Passed straight through from the view rather than recomputed.
    expect(info.nextThreshold).toBe(view.nextThreshold);
    expect(info.pointsToNext).toBe(view.pointsToNext);
    expect(info.progress).toBe(view.progress);
  });

  it('reports no next tier at the top', () => {
    const view = getTierView(
      { lifetimePoints: 9000, createdAt: new Date('2026-01-01') },
      settings({
        tierWindowMonths: 0,
        connoisseurThreshold: 1000,
        masterCutThreshold: 5000,
      }),
      new Date('2026-06-01'),
    );
    const info = tierViewToInfo(
      view,
      settings({ connoisseurThreshold: 1000, masterCutThreshold: 5000 }),
    );

    expect(info.tier).toBe('masterCut');
    expect(info.nextTier).toBeNull();
    expect(info.nextThreshold).toBeNull();
    expect(info.threshold).toBe(5000);
  });

  it('reports the bottom tier as starting from zero', () => {
    const view = getTierView(
      { lifetimePoints: 0, createdAt: new Date('2026-01-01') },
      settings({ tierWindowMonths: 0, connoisseurThreshold: 1000 }),
      new Date('2026-06-01'),
    );
    const info = tierViewToInfo(view, config);

    expect(info.tier).toBe('regular');
    expect(info.threshold).toBe(0);
    expect(info.nextTier).toBe('connoisseur');
  });

  // The navbar menu draws its bar from `qualifying` and its caption from
  // `pointsToNext`. If those two ever stop agreeing against `nextThreshold`,
  // the bar and the sentence under it contradict each other.
  it('leaves qualifying + pointsToNext summing to the next threshold', () => {
    const view = getTierView(
      {
        createdAt: new Date('2026-01-01'),
        tierAnniversaryAt: new Date('2026-01-01'),
        pointsHistory: [
          {
            delta: 326,
            reason: 'order_fulfilled',
            createdAt: new Date('2026-03-01'),
          },
        ],
      },
      config,
      new Date('2026-06-01'),
    );
    const info = tierViewToInfo(view, config);

    expect(view.qualifying).toBe(326);
    expect(view.qualifying + info.pointsToNext).toBe(info.nextThreshold);
  });
});

describe('projectRewards', () => {
  // Realistic demo config: 1 pt/$1, 100 pts = $5, tiers at 250 / 1000.
  // `demo` inherits tierWindowMonths: 0 (lifetime); the window regime is
  // exercised explicitly below since that's where the old code misreported.
  const demo = () =>
    settings({ connoisseurThreshold: 250, masterCutThreshold: 1000 });
  const windowed = () =>
    settings({
      connoisseurThreshold: 250,
      masterCutThreshold: 1000,
      tierWindowMonths: 12,
    });

  it('projects monthly points from the earn rate', () => {
    expect(projectRewards(120, demo()).monthlyPoints).toBe(120);
    // Double rate doubles the monthly points.
    expect(
      projectRewards(
        120,
        settings({
          pointsPerDollar: 2,
          connoisseurThreshold: 250,
          masterCutThreshold: 1000,
        }),
      ).monthlyPoints,
    ).toBe(240);
  });

  it('projects yearly dollars back at the redemption ratio', () => {
    // 120 pts/mo × 12 = 1440 pts → 1440/100 × $5 = $72.
    expect(projectRewards(120, demo()).yearlyDollarsBack).toBe(72);
    // A 200 pts = $10 ratio yields the same value per point.
    expect(
      projectRewards(
        100,
        settings({
          redemptionPoints: 200,
          redemptionDollars: 10,
          connoisseurThreshold: 250,
          masterCutThreshold: 1000,
        }),
      ).yearlyDollarsBack,
    ).toBe(60);
  });

  it('names the highest tier reachable within the horizon and the months to get there', () => {
    // $120/mo → Master Cut in ceil(1000/120) = 9 months.
    const high = projectRewards(120, demo());
    expect(high.reach).toEqual({
      kind: 'reached',
      tierLabel: 'Master Cut',
      months: 9,
    });

    // $30/mo → past Connoisseur (ceil(250/30)=9) but not Master (ceil(1000/30)=34).
    const mid = projectRewards(30, demo());
    expect(mid.reach).toEqual({
      kind: 'reached',
      tierLabel: 'Connoisseur',
      months: 9,
    });
  });

  it('reaches a tier exactly on the horizon boundary (<=, not <)', () => {
    // master 1440 at $120/mo → ceil(1440/120) = 12 = the lifetime horizon.
    const onBoundary = projectRewards(
      120,
      settings({ connoisseurThreshold: 250, masterCutThreshold: 1440 }),
    );
    expect(onBoundary.reach).toEqual({
      kind: 'reached',
      tierLabel: 'Master Cut',
      months: 12,
    });
  });

  it('lifetime tiers: "slow" when the pace needs more than a year', () => {
    // $20/mo, lifetime tiers → ceil(250/20) = 13 > 12 → reachable, just slow.
    const slow = projectRewards(20, demo());
    expect(slow.reach).toEqual({ kind: 'slow', tierLabel: 'Connoisseur' });
  });

  it('rolling window: "stuck" when qualifying resets before the tier is reached', () => {
    // $20/mo with a 12-month window → 240 pts/window < 250 → the customer
    // plateaus at Regular and never reaches Connoisseur at this pace. The old
    // code claimed "over a year" here, which was a lie under the window.
    const stuck = projectRewards(20, windowed());
    expect(stuck.reach).toEqual({
      kind: 'stuck',
      stayLabel: 'Regular',
      tierLabel: 'Connoisseur',
    });
  });

  it('rolling window: still reaches a tier that fits inside one window', () => {
    // $120/mo, 12-month window → Master Cut in 9 months, well inside the window.
    const high = projectRewards(120, windowed());
    expect(high.reach).toEqual({
      kind: 'reached',
      tierLabel: 'Master Cut',
      months: 9,
    });
  });

  it('reports "none" when nothing is earned', () => {
    const none = projectRewards(0, demo());
    expect(none.monthlyPoints).toBe(0);
    expect(none.yearlyDollarsBack).toBe(0);
    expect(none.reach).toEqual({ kind: 'none' });
  });
});

describe('splitRedemptionAgainstBalance', () => {
  // The scenario this exists for: a customer with 500 points opens two
  // checkouts, each redeeming 500. Validation runs at session creation against
  // a balance read then, so both pass. The deduction runs later, per order.
  it('lets the first webhook take the full redemption', () => {
    expect(splitRedemptionAgainstBalance({ requested: 500, available: 500 })).toEqual({
      applied: 500,
      shortfall: 0,
    });
  });

  it('lets the second webhook take nothing, and names the gap', () => {
    // Previously both applied `$inc: -500` and the stored balance went to -500.
    // Mongoose update validators never run for `$inc`, so the schema's `min: 0`
    // could not catch it — which is why the clamp lives in the query.
    expect(splitRedemptionAgainstBalance({ requested: 500, available: 0 })).toEqual({
      applied: 0,
      shortfall: 500,
    });
  });

  it('takes what is left on a partial overlap', () => {
    // The realistic middle case: some other activity moved the balance between
    // the quote and the deduction.
    expect(splitRedemptionAgainstBalance({ requested: 500, available: 120 })).toEqual({
      applied: 120,
      shortfall: 380,
    });
  });

  it('never reports a negative shortfall when the balance grew', () => {
    // A `Math.min` written the wrong way round returns -300 here, which reads
    // as "nothing absorbed" at every call site that checks `> 0`.
    expect(splitRedemptionAgainstBalance({ requested: 200, available: 500 })).toEqual({
      applied: 200,
      shortfall: 0,
    });
  });

  it('floors a legacy negative balance rather than inverting the split', () => {
    // Balances written before the clamp can be negative. Without the floor,
    // `Math.min(200, -500)` applies -500 — crediting the customer on a
    // deduction path.
    expect(splitRedemptionAgainstBalance({ requested: 200, available: -500 })).toEqual({
      applied: 0,
      shortfall: 200,
    });
  });

  it('is a no-op for an order that redeemed nothing', () => {
    expect(splitRedemptionAgainstBalance({ requested: 0, available: 500 })).toEqual({
      applied: 0,
      shortfall: 0,
    });
  });

  it('never applies a fractional point', () => {
    expect(splitRedemptionAgainstBalance({ requested: 10.9, available: 5.9 })).toEqual({
      applied: 5,
      shortfall: 5,
    });
  });
});

describe('creditableReturn', () => {
  // The defect this exists for, introduced by the deduction clamp and caught in
  // review: `pointsRedeemed` is what the customer was QUOTED. Once the
  // deduction started clamping at the live balance it stopped being what they
  // were CHARGED, and the reversal paths still read the quoted figure.
  it('returns nothing for a redemption the shop could not fund at all', () => {
    // Order quoted 500 against a balance a concurrent order had drained, so 0
    // was taken. Returning 500 here credits points that never left the balance
    // — minting it out of a cancellation.
    expect(
      creditableReturn({ pointsRedeemed: 500, shortfall: 500, requested: 500 }),
    ).toBe(0);
  });

  it('returns only the part that was actually taken', () => {
    expect(
      creditableReturn({ pointsRedeemed: 500, shortfall: 380, requested: 500 }),
    ).toBe(120);
  });

  it('returns the whole redemption when nothing was short', () => {
    expect(creditableReturn({ pointsRedeemed: 500, requested: 500 })).toBe(500);
  });

  it('caps a partial refund at what is left to give back', () => {
    // Proportional refunds ask for a share of `pointsRedeemed`, which can
    // exceed the remainder once a shortfall is in play.
    expect(
      creditableReturn({
        pointsRedeemed: 500,
        shortfall: 380,
        alreadyReturned: 100,
        requested: 250,
      }),
    ).toBe(20);
  });

  it('gives nothing back once the full amount has been returned', () => {
    // A refund racing a cancel: the second call must claim nothing.
    expect(
      creditableReturn({
        pointsRedeemed: 500,
        alreadyReturned: 500,
        requested: 500,
      }),
    ).toBe(0);
  });

  it('never goes negative when more has been returned than was taken', () => {
    // Defensive: legacy rows written before the shortfall field existed could
    // carry a `pointsRedemptionReturned` above the new ceiling.
    expect(
      creditableReturn({
        pointsRedeemed: 500,
        shortfall: 400,
        alreadyReturned: 500,
        requested: 100,
      }),
    ).toBe(0);
  });

  it('treats a missing shortfall as zero, so legacy orders are unaffected', () => {
    // Every order written before this field defaults to 0 and must behave
    // exactly as it did before.
    expect(
      creditableReturn({ pointsRedeemed: 300, alreadyReturned: 100, requested: 300 }),
    ).toBe(200);
  });
});
