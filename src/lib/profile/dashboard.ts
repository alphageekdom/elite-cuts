import type { OrderItem, OrderStatus } from '@/models/Order';
import { shopYear } from '@/lib/shop-settings/pickup-format';
import { refundSummary } from '@/lib/orders/refunds';

// Pure derivations behind the account dashboard's Overview tab. Kept out of
// the page so each one can be read (and tested) on its own, and so the server
// component reads as a query followed by named calls.

// An order is "in flight" until it is collected or called off. Everything
// between those two ends is something the customer is still waiting on, so
// the Overview's active-order card covers the lot rather than singling out
// one status — a delivery order sits in 'Out for Delivery', a pickup order in
// 'Ready for Pickup', and both are equally live to the person waiting.
const CLOSED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'Completed',
  'Cancelled',
]);

export function isActiveOrder(status: OrderStatus): boolean {
  return !CLOSED_STATUSES.has(status);
}

/** The newest order still in flight, or null. Orders arrive newest-first. */
export function findActiveOrder<T extends { orderStatus: OrderStatus }>(
  orders: readonly T[],
): T | null {
  return orders.find((o) => isActiveOrder(o.orderStatus)) ?? null;
}

// ── Buy it again ───────────────────────────────────────────────────────────

type OrderLike = {
  orderStatus: OrderStatus;
  createdAt: string;
  orderItems: readonly {
    product: string;
    name: string;
    qty: number;
    refunded?: boolean;
  }[];
};

export type RepeatTally = {
  productId: string;
  /** How many separate orders contained this cut — not the unit count. */
  times: number;
  /** ISO date of the most recent order containing it, for tie-breaking. */
  lastOrderedAt: string;
};

/**
 * Which cuts the customer keeps coming back for, newest orders first.
 *
 * Counts *orders containing* the cut rather than units bought, because "3×"
 * next to a repeat-purchase prompt reads as "you've ordered this three times",
 * not "you once bought three of them". Cancelled orders and refunded lines are
 * skipped — neither is something the customer actually took home.
 *
 * `excludeProductIds` keeps cuts that are already on their way out of the
 * prompt. Without it a customer with one live order sees the same cuts three
 * times down the page — named in the active-order card, offered back under
 * "Buy it again", and listed again under recent orders — which is exactly what
 * a demo visitor sees after following the tour's first step.
 *
 * Returns tallies keyed by product id; the caller resolves those against the
 * live catalog, which is what keeps a withdrawn or sold-out cut from being
 * offered back.
 */
export function tallyRepeatCuts(
  orders: readonly OrderLike[],
  {
    lookback = 5,
    excludeProductIds,
  }: { lookback?: number; excludeProductIds?: Iterable<string> } = {},
): RepeatTally[] {
  const tallies = new Map<string, RepeatTally>();
  const excluded = new Set(excludeProductIds ?? []);

  for (const order of orders.slice(0, lookback)) {
    if (order.orderStatus === 'Cancelled') continue;
    // One order counts once per distinct cut, however many lines it spans.
    const seen = new Set<string>();
    for (const item of order.orderItems) {
      if (item.refunded) continue;
      if (excluded.has(item.product)) continue;
      if (seen.has(item.product)) continue;
      seen.add(item.product);

      const existing = tallies.get(item.product);
      if (existing) {
        existing.times += 1;
      } else {
        tallies.set(item.product, {
          productId: item.product,
          times: 1,
          lastOrderedAt: order.createdAt,
        });
      }
    }
  }

  return [...tallies.values()].sort(
    (a, b) =>
      b.times - a.times ||
      new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime(),
  );
}

// ── Habits ─────────────────────────────────────────────────────────────────

export type Habit = { label: string; value: string };

// Wider than `OrderLike`: the spend figure nets off refunds, and
// `refundSummary` needs each line's price plus the order's pre-tax split to
// work out what actually went back.
type HabitOrderLike = {
  orderStatus: OrderStatus;
  createdAt: string;
  subtotal: number;
  tax: number;
  totalCost: number;
  orderItems: readonly Pick<
    OrderItem,
    'name' | 'qty' | 'price' | 'refunded' | 'pricingType' | 'pricePerLb' | 'realizedWeightLb'
  >[];
};

/**
 * The three habit stats that are honestly derivable from order history.
 *
 * A fourth — "usual pickup day" — is deliberately absent. Pre-redesign orders
 * store prose slot labels ("4–5p") while newer ones store datetimes, so a
 * weekday cannot be recovered across mixed history, and guessing one would put
 * a wrong day in front of the customer.
 *
 * Cancelled orders are excluded throughout: they were called off, so counting
 * them would inflate both the order count and the spend.
 *
 * "This year" is the shop's year, not the runtime's. `createdAt` is a UTC
 * instant and the server is UTC on Vercel, so reading the year off either side
 * with `getFullYear` rolls the boundary over eight hours early in Pacific —
 * the stat would read zero while the counter was still trading on the 31st.
 * The greeting on the same tab already reads the shop's clock; this is the
 * same correction one unit coarser.
 */
export function buildHabits(
  orders: readonly HabitOrderLike[],
  timezone: string,
  now: Date = new Date(),
): Habit[] {
  const kept = orders.filter((o) => o.orderStatus !== 'Cancelled');
  if (kept.length === 0) return [];

  const thisYear = shopYear(timezone, now);
  const ordersThisYear = kept.filter(
    (o) => shopYear(timezone, new Date(o.createdAt)) === thisYear,
  ).length;

  // Net of refunds. `totalCost` is what the order was placed for and never
  // moves when lines are refunded, so summing it alone counted money that
  // went back to the customer. `refundedAmount` is derived rather than
  // stored — the receipt page and the admin serializer both reach it through
  // `refundSummary`, so this does too rather than inventing a third answer.
  // The most-ordered tally below already skips refunded lines on exactly this
  // reasoning; the headline figure now agrees with it.
  const spent = kept.reduce((sum, o) => {
    const refunded = refundSummary(o.orderItems, {
      subtotal: o.subtotal,
      tax: o.tax,
      totalCost: o.totalCost,
    }).refundedAmount;
    return sum + Math.max(0, o.totalCost - refunded);
  }, 0);

  // Most-ordered is by unit count, unlike the repeat tally above — here the
  // question is "what fills your basket", so six packs of mince in one order
  // should outrank one ribeye bought twice.
  const units = new Map<string, number>();
  for (const order of kept) {
    for (const item of order.orderItems) {
      if (item.refunded) continue;
      units.set(item.name, (units.get(item.name) ?? 0) + item.qty);
    }
  }
  const mostOrdered = [...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const habits: Habit[] = [
    { label: 'Orders this year', value: String(ordersThisYear) },
    {
      label: 'Spent all time',
      value: `$${spent.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  ];
  if (mostOrdered) habits.push({ label: 'Most ordered', value: mostOrdered });
  return habits;
}
