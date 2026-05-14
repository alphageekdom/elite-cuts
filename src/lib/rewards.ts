import type { ShopSettings } from '@/models/ShopSettings';
import type { PointsHistoryEntry } from '@/models/User';

export type Tier = 'regular' | 'connoisseur' | 'masterCut';

export type TierInfo = {
  tier: Tier;
  label: string;
  threshold: number;        // lifetime points required to reach this tier
  nextTier: Tier | null;    // null when already at top tier
  nextThreshold: number | null;
  pointsToNext: number;     // 0 when at top tier
  progress: number;         // 0..1 within the current band (1 when at top tier)
};

export type RedemptionInput = {
  pointsToRedeem: number;
  currentBalance: number;
  settings: Pick<ShopSettings, 'redemptionPoints' | 'redemptionDollars' | 'minToRedeem'>;
};

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
// minimum, balance, and integer-ness before any DB writes. Never trust the
// client with the value; always run this on the server.
export function applyRedemption({
  pointsToRedeem,
  currentBalance,
  settings,
}: RedemptionInput): RedemptionResult {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    return { valid: false, error: 'Points to redeem must be a positive whole number' };
  }
  if (pointsToRedeem > currentBalance) {
    return { valid: false, error: 'Not enough points' };
  }
  if (pointsToRedeem < settings.minToRedeem) {
    return { valid: false, error: `Minimum ${settings.minToRedeem} points to redeem` };
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
    return { valid: false, error: 'Redemption would not reduce the order total' };
  }
  return {
    valid: true,
    pointsUsed: usable,
    valueCents,
    newBalance: currentBalance - usable,
  };
}

// Format helper for the redemption rate so settings, the marketing page, and
// the checkout block all show the same wording without hand-templating.
export function formatRedemptionRate(
  settings: Pick<ShopSettings, 'redemptionPoints' | 'redemptionDollars'>,
): string {
  const pts = Math.max(1, Math.floor(settings.redemptionPoints));
  const dollars = Math.max(0, settings.redemptionDollars);
  const dollarLabel = Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  return `${pts.toLocaleString('en-US')} pts = ${dollarLabel} off`;
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
  balance: number;            // live balance with expired awards dropped, floored at 0
  storedBalance: number;      // the User.rewardPoints field, untouched
  lifetimePoints: number;     // User.lifetimePoints, untouched
  expiredPoints: number;      // sum of positive awards that have aged past expiresAt
  recentHistory: PointsHistoryEntry[];  // newest first, capped
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
      (entry.reason === 'cancel_reverse' || entry.reason === 'refund_reverse') &&
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, recentLimit);

  return {
    balance: Math.max(0, stored - expired),
    storedBalance: stored,
    lifetimePoints: lifetime,
    expiredPoints: expired,
    recentHistory: recent,
  };
}
