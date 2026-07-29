import type { ShopSettings } from '@/models/ShopSettings';
import type { PointsHistoryEntry } from '@/models/User';

export type Tier = 'regular' | 'connoisseur' | 'masterCut';

// Ordering for tier-up comparisons. Higher index = higher tier.
const TIER_ORDER: Tier[] = ['regular', 'connoisseur', 'masterCut'];

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

// Pure helper to add N months to a Date. Avoids pulling in a date library
// for one operation; matches the JS Date semantics (Feb 30 → Mar 2 etc.).
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

export type TierInfo = {
  tier: Tier;
  label: string;
  threshold: number; // lifetime points required to reach this tier
  nextTier: Tier | null; // null when already at top tier
  nextThreshold: number | null;
  pointsToNext: number; // 0 when at top tier
  progress: number; // 0..1 within the current band (1 when at top tier)
};

export type RedemptionInput = {
  pointsToRedeem: number;
  currentBalance: number;
  settings: Pick<
    ShopSettings,
    | 'redemptionPoints'
    | 'redemptionDollars'
    | 'minToRedeem'
    | 'maxRedemptionPercent'
    | 'maxRedemptionDollars'
  >;
  /**
   * The order's subtotal in dollars. When provided, the per-order cap
   * (min of percent × subtotal, flat $) is enforced. Omit to skip the cap
   * (helpful for legacy callers / tests that don't care about per-order
   * limits — but real flows should always pass it).
   */
  orderSubtotalDollars?: number;
};

export type RedemptionCap = {
  capDollars: number; // the effective cap as a dollar amount
  capCents: number; // same, in cents (matches applyRedemption result units)
};

// Pure helper: compute the per-order cap from settings + subtotal.
// Exposed so the checkout UI can render the same cap the server enforces.
// flat=0 is treated as "no flat ceiling, percent alone applies" so admins
// can disable the flat cap by zeroing it.
export function computeRedemptionCap(
  subtotalDollars: number,
  settings: Pick<ShopSettings, 'maxRedemptionPercent' | 'maxRedemptionDollars'>,
): RedemptionCap {
  const safeSubtotal = Math.max(0, subtotalDollars);
  const pct = Math.max(1, Math.min(100, settings.maxRedemptionPercent ?? 100));
  const flat = Math.max(0, settings.maxRedemptionDollars ?? 0);
  const percentDollars = (safeSubtotal * pct) / 100;
  const capDollars =
    flat <= 0 ? percentDollars : Math.min(percentDollars, flat);
  return {
    capDollars,
    capCents: Math.floor(capDollars * 100),
  };
}

export type RedemptionResult =
  | { valid: true; pointsUsed: number; valueCents: number; newBalance: number }
  | { valid: false; error: string };

const TIER_LABELS: Record<Tier, string> = {
  regular: 'Regular',
  connoisseur: 'Connoisseur',
  masterCut: 'Master Cut',
};

// Tier compute reads thresholds straight off settings so an admin's change
// flows everywhere that surfaces a tier without code edits.
export function getTier(
  lifetimePoints: number,
  settings: Pick<ShopSettings, 'connoisseurThreshold' | 'masterCutThreshold'>,
): TierInfo {
  const lp = Math.max(0, Math.floor(lifetimePoints));
  const conn = Math.max(0, Math.floor(settings.connoisseurThreshold));
  const master = Math.max(conn, Math.floor(settings.masterCutThreshold));

  if (lp >= master) {
    return {
      tier: 'masterCut',
      label: TIER_LABELS.masterCut,
      threshold: master,
      nextTier: null,
      nextThreshold: null,
      pointsToNext: 0,
      progress: 1,
    };
  }
  if (lp >= conn) {
    const span = Math.max(1, master - conn);
    return {
      tier: 'connoisseur',
      label: TIER_LABELS.connoisseur,
      threshold: conn,
      nextTier: 'masterCut',
      nextThreshold: master,
      pointsToNext: master - lp,
      progress: (lp - conn) / span,
    };
  }
  const span = Math.max(1, conn);
  return {
    tier: 'regular',
    label: TIER_LABELS.regular,
    threshold: 0,
    nextTier: 'connoisseur',
    nextThreshold: conn,
    pointsToNext: conn - lp,
    progress: lp / span,
  };
}

// Earn rate per order: floor(subtotal * pointsPerDollar * weekendMultiplierIfWeekend).
// Subtotal is in dollars (e.g. 24.50). Weekend = Sat or Sun in UTC; tier-based
// multipliers (Connoisseur 2×, Master Cut 3× on the marketing page) are
// orthogonal and will be applied as a separate factor in Phase B if/when wired.
export function computeAward(
  subtotalDollars: number,
  settings: Pick<ShopSettings, 'pointsPerDollar' | 'weekendMultiplier'>,
  awardedOn: Date = new Date(),
): number {
  if (!Number.isFinite(subtotalDollars) || subtotalDollars <= 0) return 0;
  const rate = Math.max(0, settings.pointsPerDollar);
  const dow = awardedOn.getUTCDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dow === 0 || dow === 6;
  const multiplier = isWeekend ? Math.max(1, settings.weekendMultiplier) : 1;
  return Math.floor(subtotalDollars * rate * multiplier);
}

// Pure conversion: how many cents is N points worth at the configured rate?
// Returns whole cents; fractional cents round down to keep the shop from
// over-crediting a redemption.
export function computeRedemption(
  pointsToRedeem: number,
  settings: Pick<ShopSettings, 'redemptionPoints' | 'redemptionDollars'>,
): number {
  if (!Number.isFinite(pointsToRedeem) || pointsToRedeem <= 0) return 0;
  const pts = Math.max(1, Math.floor(settings.redemptionPoints));
  const dollars = Math.max(0, settings.redemptionDollars);
  const valueCents = Math.floor((pointsToRedeem / pts) * dollars * 100);
  return Math.max(0, valueCents);
}

// Server-side gate for "the customer wants to redeem N points." Validates
// minimum, balance, integer-ness, and the per-order cap before any DB
// writes. Never trust the client with the value; always run this on the
// server.
export function applyRedemption({
  pointsToRedeem,
  currentBalance,
  settings,
  orderSubtotalDollars,
}: RedemptionInput): RedemptionResult {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    return {
      valid: false,
      error: 'Points to redeem must be a positive whole number',
    };
  }
  if (pointsToRedeem > currentBalance) {
    return { valid: false, error: 'Not enough points' };
  }
  if (pointsToRedeem < settings.minToRedeem) {
    return {
      valid: false,
      error: `Minimum ${settings.minToRedeem} points to redeem`,
    };
  }
  // Round redemption down to the nearest whole "block" (e.g. multiples of 100)
  // so the customer never spends a partial conversion that yields zero cents.
  const block = Math.max(1, Math.floor(settings.redemptionPoints));
  const usable = Math.floor(pointsToRedeem / block) * block;
  if (usable <= 0) {
    return { valid: false, error: `Redeem in increments of ${block} points` };
  }
  const valueCents = computeRedemption(usable, settings);
  if (valueCents <= 0) {
    return {
      valid: false,
      error: 'Redemption would not reduce the order total',
    };
  }
  // Per-order cap — min(percent × subtotal, flat $). Only enforced when
  // the caller passes orderSubtotalDollars; legacy callers without it skip
  // this branch.
  if (typeof orderSubtotalDollars === 'number' && orderSubtotalDollars > 0) {
    const cap = computeRedemptionCap(orderSubtotalDollars, settings);
    if (valueCents > cap.capCents) {
      const valueDollars = (valueCents / 100).toFixed(2);
      const capDollars = (cap.capCents / 100).toFixed(2);
      return {
        valid: false,
        error: `Redemption ($${valueDollars}) exceeds the per-order cap ($${capDollars})`,
      };
    }
  }
  return {
    valid: true,
    pointsUsed: usable,
    valueCents,
    newBalance: currentBalance - usable,
  };
}

// What a balance is actually worth, in whole dollars.
//
// `applyRedemption` floors the spend to whole `redemptionPoints` blocks before
// converting, so a partial block buys nothing. Display code that divides first
// and floors the dollars afterwards over-states the balance: at the default
// 100 pts = $5, a 420 balance is 4 whole blocks = $20, but `floor(420 / 100 *
// 5)` reports $21 — a dollar the customer can never spend. Both the profile
// and any other surface quoting a balance's worth must come through here.
export function redeemableValueDollars(
  points: number,
  settings: Pick<ShopSettings, 'redemptionPoints' | 'redemptionDollars'>,
): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  const block = Math.max(1, Math.floor(settings.redemptionPoints));
  const blocks = Math.floor(points / block);
  return blocks * Math.max(0, settings.redemptionDollars);
}

// The per-order ceiling stated without an order in hand.
//
// The real cap is `min(percent × subtotal, flat $)` and needs a subtotal, which
// the profile doesn't have. Quoting the balance's worth without saying a cap
// exists is the overstatement this returns the words for: the flat ceiling is
// a fixed number worth naming, and the percentage is the part that bites on
// small orders. Returns null when the shop has configured neither.
export function describeRedemptionCap(
  settings: Pick<ShopSettings, 'maxRedemptionPercent' | 'maxRedemptionDollars'>,
): string | null {
  const pct = Math.max(0, Math.min(100, settings.maxRedemptionPercent ?? 0));
  const flat = Math.max(0, settings.maxRedemptionDollars ?? 0);
  const hasPct = pct > 0 && pct < 100;
  const hasFlat = flat > 0;
  if (!hasPct && !hasFlat) return null;
  if (hasPct && hasFlat) {
    return `up to $${flat} an order, and never more than ${pct}% of the subtotal`;
  }
  if (hasFlat) return `up to $${flat} an order`;
  return `never more than ${pct}% of an order's subtotal`;
}

// Format helper for the redemption rate so settings, the marketing page, and
// the checkout block all show the same wording without hand-templating.
export function formatRedemptionRate(
  settings: Pick<ShopSettings, 'redemptionPoints' | 'redemptionDollars'>,
): string {
  const pts = Math.max(1, Math.floor(settings.redemptionPoints));
  const dollars = Math.max(0, settings.redemptionDollars);
  const dollarLabel = Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
  return `${pts.toLocaleString('en-US')} pts = ${dollarLabel} off`;
}

// ── Rewards projection (marketing calculator) ────────────────────────────
// Rough "what a month gives back" estimate for the Rewards page calculator.
// Deliberately an estimate: it ignores the weekend multiplier (Sat/Sun only),
// the per-order redemption cap, and points expiry, so the UI must label it as
// such. Reads the earn rate, redemption ratio, tier thresholds, and the tier
// window from settings so the number always matches the configured reality.
//
// The `reach` shape is a discriminated union rather than a pre-formatted
// string so the component can render honest, grammatical copy for each case —
// and, critically, so the rolling-window regime isn't misreported. When
// `tierWindowMonths > 0`, qualifying points reset each window, so a pace that
// can't cross a threshold within one window never reaches that tier at all
// ('stuck') — saying "over a year" there would be a lie. Only lifetime tiers
// (`tierWindowMonths === 0`) get the "eventually, just slowly" ('slow') case.
export type RewardsReach =
  | { kind: 'reached'; tierLabel: string; months: number }
  | { kind: 'slow'; tierLabel: string } // lifetime tiers, more than a year out
  | { kind: 'stuck'; stayLabel: string; tierLabel: string } // window resets first
  | { kind: 'none' }; // no points earned at this pace

export type RewardsProjection = {
  monthlyPoints: number;
  yearlyDollarsBack: number;
  reach: RewardsReach;
};

export function projectRewards(
  monthlySpendDollars: number,
  settings: Pick<
    ShopSettings,
    | 'pointsPerDollar'
    | 'redemptionPoints'
    | 'redemptionDollars'
    | 'connoisseurThreshold'
    | 'masterCutThreshold'
    | 'tierWindowMonths'
  >,
): RewardsProjection {
  const spend = Math.max(0, monthlySpendDollars);
  const rate = Math.max(0, settings.pointsPerDollar);
  const monthlyPoints = Math.floor(spend * rate);

  // Dollars back per year: convert a year of points at the redemption ratio.
  const redeemPts = Math.max(1, Math.floor(settings.redemptionPoints));
  const redeemDollars = Math.max(0, settings.redemptionDollars);
  const yearlyDollarsBack = Math.round(
    ((monthlyPoints * 12) / redeemPts) * redeemDollars,
  );

  const conn = Math.max(0, Math.floor(settings.connoisseurThreshold));
  const master = Math.max(conn, Math.floor(settings.masterCutThreshold));
  const connLabel = getTier(conn, settings).label;
  const masterLabel = getTier(master, settings).label;

  // No earning → no honest projection.
  if (monthlyPoints <= 0) {
    return { monthlyPoints, yearlyDollarsBack, reach: { kind: 'none' } };
  }

  // Rolling window: qualifying resets every `tierWindowMonths`, so a tier is
  // only reachable if the pace crosses its threshold within one window. A
  // 0-month window means lifetime tiers (points never reset) — there a
  // one-year horizon is used purely to decide when to say "a little over a
  // year" instead of naming a large month count.
  const windowMonths = Math.max(0, Math.floor(settings.tierWindowMonths ?? 0));
  const horizon = windowMonths > 0 ? windowMonths : 12;
  const monthsToReach = (threshold: number) =>
    Math.ceil(threshold / monthlyPoints);

  const masterMonths = monthsToReach(master);
  if (masterMonths <= horizon) {
    return {
      monthlyPoints,
      yearlyDollarsBack,
      reach: { kind: 'reached', tierLabel: masterLabel, months: masterMonths },
    };
  }
  const connMonths = monthsToReach(conn);
  if (connMonths <= horizon) {
    return {
      monthlyPoints,
      yearlyDollarsBack,
      reach: { kind: 'reached', tierLabel: connLabel, months: connMonths },
    };
  }

  // Connoisseur is out of reach within the horizon.
  if (windowMonths > 0) {
    // Rolling window: qualifying resets before the threshold is met, so the
    // customer plateaus below Connoisseur rather than ever arriving there.
    const stayLabel = getTier(monthlyPoints * windowMonths, settings).label;
    return {
      monthlyPoints,
      yearlyDollarsBack,
      reach: { kind: 'stuck', stayLabel, tierLabel: connLabel },
    };
  }
  // Lifetime tiers: reachable eventually, just slowly.
  return {
    monthlyPoints,
    yearlyDollarsBack,
    reach: { kind: 'slow', tierLabel: connLabel },
  };
}

// The exact rewards-config slice the client-side rewards components need. The
// full ShopSettings doc carries admin-only fields (notification toggles, the
// dormancy threshold, pickup-ops config) that have no business crossing the
// server/client boundary — the marketing page's client components (Standing,
// Calculator, FAQ) take this narrowed shape and the server page builds it via
// `toRewardsPublicSettings`, so nothing admin-only serializes into the RSC
// payload.
export type RewardsPublicSettings = Pick<
  ShopSettings,
  | 'pointsPerDollar'
  | 'weekendMultiplier'
  | 'minToRedeem'
  | 'pointsExpiryMonths'
  | 'tierWindowMonths'
  | 'connoisseurThreshold'
  | 'masterCutThreshold'
  | 'redemptionPoints'
  | 'redemptionDollars'
>;

export function toRewardsPublicSettings(
  settings: ShopSettings,
): RewardsPublicSettings {
  return {
    pointsPerDollar: settings.pointsPerDollar,
    weekendMultiplier: settings.weekendMultiplier,
    minToRedeem: settings.minToRedeem,
    pointsExpiryMonths: settings.pointsExpiryMonths,
    tierWindowMonths: settings.tierWindowMonths,
    connoisseurThreshold: settings.connoisseurThreshold,
    masterCutThreshold: settings.masterCutThreshold,
    redemptionPoints: settings.redemptionPoints,
    redemptionDollars: settings.redemptionDollars,
  };
}

export function formatPointsExpiry(
  settings: Pick<ShopSettings, 'pointsExpiryMonths'>,
): string {
  const months = Math.max(0, Math.floor(settings.pointsExpiryMonths));
  if (months === 0) return 'Points never expire';
  if (months === 1) return 'Points expire after 1 month';
  return `Points expire after ${months} months`;
}

export type EffectiveBalance = {
  balance: number; // live balance with expired awards dropped, floored at 0
  storedBalance: number; // the User.rewardPoints field, untouched
  lifetimePoints: number; // User.lifetimePoints, untouched
  expiredPoints: number; // sum of positive awards that have aged past expiresAt
  recentHistory: PointsHistoryEntry[]; // newest first, capped
};

// Pure read-side view of a user's points. Walks the history once: positive
// award entries past their expiresAt are subtracted from the stored balance
// (floored at 0); the stored counter itself is left alone so that any in-
// flight redemption math keeps working on the truth value. Lifetime and
// stored values are returned verbatim from the user doc.
//
// Award entries from orders that were later cancelled or refunded are
// excluded from the expired pool — their reversal entry already pulled the
// points back out of the balance, so counting them as expired too would
// double-decay the customer.
export function getEffectiveBalance(
  user: {
    rewardPoints?: number;
    lifetimePoints?: number;
    pointsHistory?: PointsHistoryEntry[];
  },
  now: Date = new Date(),
  recentLimit = 10,
): EffectiveBalance {
  const stored = Math.max(0, user.rewardPoints ?? 0);
  const lifetime = Math.max(0, user.lifetimePoints ?? 0);
  const history = user.pointsHistory ?? [];
  const nowMs = now.getTime();

  const reversedOrderIds = new Set<string>();
  for (const entry of history) {
    if (
      (entry.reason === 'cancel_reverse' ||
        entry.reason === 'refund_reverse') &&
      entry.orderId
    ) {
      reversedOrderIds.add(String(entry.orderId));
    }
  }

  let expired = 0;
  for (const entry of history) {
    if (
      entry.delta > 0 &&
      entry.reason === 'order_fulfilled' &&
      entry.expiresAt &&
      new Date(entry.expiresAt).getTime() < nowMs &&
      !(entry.orderId && reversedOrderIds.has(String(entry.orderId)))
    ) {
      expired += entry.delta;
    }
  }

  const recent = [...history]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, recentLimit);

  return {
    balance: Math.max(0, stored - expired),
    storedBalance: stored,
    lifetimePoints: lifetime,
    expiredPoints: expired,
    recentHistory: recent,
  };
}

// Sums earning activity (positive order_fulfilled + negative cancel/refund
// reverses) dated within [windowStart, now]. Redemption entries are
// deliberately ignored — redeeming points doesn't reduce a customer's tier
// qualification, just their spendable balance.
export function getQualifyingPoints(
  history: PointsHistoryEntry[],
  windowStart: Date,
  now: Date = new Date(),
): number {
  const startMs = windowStart.getTime();
  const endMs = now.getTime();
  let qualifying = 0;
  for (const entry of history) {
    const t = new Date(entry.createdAt).getTime();
    if (t < startMs || t > endMs) continue;
    if (entry.reason === 'order_fulfilled') {
      qualifying += entry.delta;
    } else if (
      entry.reason === 'cancel_reverse' ||
      entry.reason === 'refund_reverse'
    ) {
      qualifying += entry.delta;
    }
  }
  return Math.max(0, qualifying);
}

// Combined view for tier-aware reads. Pure function — the caller is
// responsible for persisting the resulting tier + anniversary if
// `reassessed` is true.
//
// Logic:
//  - windowMonths = 0 → no anniversary window; fall back to lifetime-based
//    tier (matches pre-D2 behavior). `reassessed` always false.
//  - Otherwise: if `now >= anniversaryAt + windowMonths`, perform the
//    annual check: compute qualifying for the period that just ended,
//    that's the new locked tier, and the new period starts at `now`.
//  - Mid-period: compute qualifying from anniversaryAt → now, but the
//    displayed tier is the higher of (currentTier on the doc, what
//    qualifying earns right now). This handles both legacy users (no
//    cached currentTier) and live tier-ups that haven't been persisted
//    yet by the award path.
export type TierView = {
  tier: Tier;
  label: string;
  qualifying: number; // pts earned this period (0 if windowMonths === 0)
  nextThreshold: number | null;
  pointsToNext: number;
  progress: number; // 0..1 within current band
  periodStart: Date; // resolved (uses createdAt fallback)
  periodEndsAt: Date | null; // null when windowMonths === 0
  reassessed: boolean; // true if the helper decided this read crossed the anniversary
  nextAnniversaryAt: Date; // value to persist if reassessed
};

export function getTierView(
  user: {
    createdAt?: Date;
    lifetimePoints?: number;
    pointsHistory?: PointsHistoryEntry[];
    tierAnniversaryAt?: Date | null;
    currentTier?: Tier | null;
  },
  settings: Pick<
    ShopSettings,
    'connoisseurThreshold' | 'masterCutThreshold' | 'tierWindowMonths'
  >,
  now: Date = new Date(),
): TierView {
  const windowMonths = Math.max(0, Math.floor(settings.tierWindowMonths ?? 0));

  // Window disabled → lifetime-based tier, no anniversary handling.
  if (windowMonths === 0) {
    const t = getTier(user.lifetimePoints ?? 0, settings);
    return {
      tier: t.tier,
      label: t.label,
      qualifying: user.lifetimePoints ?? 0,
      nextThreshold: t.nextThreshold,
      pointsToNext: t.pointsToNext,
      progress: t.progress,
      periodStart: user.createdAt ?? new Date(0),
      periodEndsAt: null,
      reassessed: false,
      nextAnniversaryAt: user.tierAnniversaryAt ?? user.createdAt ?? now,
    };
  }

  // Window active. Resolve the period start (anniversary or createdAt fallback).
  const periodStart = user.tierAnniversaryAt
    ? new Date(user.tierAnniversaryAt)
    : (user.createdAt ?? now);
  const periodEnd = addMonths(periodStart, windowMonths);
  const history = user.pointsHistory ?? [];

  // Past the anniversary → annual reassessment. Compute qualifying for the
  // just-ended period and lock that as the new tier. Start a fresh period
  // from `now`. Callers persist on reassessed === true.
  if (now.getTime() >= periodEnd.getTime()) {
    const finalQualifying = getQualifyingPoints(
      history,
      periodStart,
      periodEnd,
    );
    const t = getTier(finalQualifying, settings);
    const nextEnd = addMonths(now, windowMonths);
    return {
      tier: t.tier,
      label: t.label,
      qualifying: 0, // fresh period — qualifying resets
      nextThreshold: t.nextThreshold,
      // Fresh period starts at 0 qualifying, so the whole next-tier threshold
      // is still ahead — not `t.pointsToNext`, which was measured from the
      // just-ended period's total and would contradict progress: 0.
      pointsToNext: t.nextThreshold ?? 0,
      progress: 0,
      periodStart: now,
      periodEndsAt: nextEnd,
      reassessed: true,
      nextAnniversaryAt: now,
    };
  }

  // Mid-period. Show the higher of cached currentTier and currently-earned
  // tier. The award path is supposed to bump currentTier on threshold
  // crosses, but this fallback handles legacy users + drift.
  const qualifying = getQualifyingPoints(history, periodStart, now);
  const earnedNow = getTier(qualifying, settings);
  const cached = user.currentTier ?? 'regular';
  const effectiveTier: Tier =
    tierRank(earnedNow.tier) > tierRank(cached) ? earnedNow.tier : cached;

  // Progress + pointsToNext are computed directly against qualifying so a
  // customer who's locked at a higher tier than their current period's
  // activity still sees an honest "how much more do I need" bar (e.g.
  // locked Connoisseur with only 100 pts this period → bar fills 10% of
  // the way to Master Cut, not 0%).
  const connThreshold = Math.max(0, Math.floor(settings.connoisseurThreshold));
  const masterThreshold = Math.max(
    connThreshold,
    Math.floor(settings.masterCutThreshold),
  );
  let nextThreshold: number | null;
  let progress: number;
  if (effectiveTier === 'masterCut') {
    nextThreshold = null;
    progress = 1;
  } else {
    nextThreshold =
      effectiveTier === 'regular' ? connThreshold : masterThreshold;
    progress = Math.min(
      1,
      Math.max(0, qualifying / Math.max(1, nextThreshold)),
    );
  }
  const pointsToNext =
    nextThreshold === null ? 0 : Math.max(0, nextThreshold - qualifying);

  return {
    tier: effectiveTier,
    label: TIER_LABELS[effectiveTier],
    qualifying,
    nextThreshold,
    pointsToNext,
    progress,
    periodStart,
    periodEndsAt: periodEnd,
    reassessed: false,
    nextAnniversaryAt: periodStart,
  };
}
