// Order history for the demo customer.
//
// Why this exists at all: points are only ever awarded when an admin fulfils
// an order, and the admin order routes are closed to demo admins
// (`withAdminNonDemo`), so a demo customer can never complete the earn loop
// themselves. The reset already seeds a points balance for exactly that
// reason. This is the same argument one step further — the account dashboard's
// order-derived half (the active-order card, "Buy it again", recent orders and
// the habit stats) is undemonstrable without history, and the points balance
// on its own had no orders behind it, so the rewards ledger showed a single
// entry captioned "Order fulfilled · Adjustment".
//
// Cuts are named by **slug**, never by id. The nightly catalog restore upserts
// on a natural key so ids survive, but slugs are the durable key by design and
// a seed keyed on ids would be one schema change away from silently producing
// orders that point at nothing.
//
// There is deliberately no `pointsAwarded` here. This table used to carry one
// per order, hand-picked so the fulfilled orders summed to a fixed balance —
// which meant a $159.99 order was captioned "+212 points" on a page that reads
// "One point per dollar" straight from settings, with the order one tab away.
// The seeder now runs each subtotal through `computeAward`, the same function
// that awards points in production, so a row can't say anything the shop's own
// rate wouldn't produce. It also can't drift: order lines are already priced
// from the *live* product, so a literal award would desync the moment a demo
// admin repriced a cut.

export type DemoOrderLine = {
  /** Product slug — resolved to the live `_id` at seed time. */
  slug: string;
  qty: number;
};

export type DemoOrderSpec = {
  /** Days before the reset run that this order was placed. */
  daysAgo: number;
  /** Points are awarded on fulfilment, so only `Completed` orders earn. */
  status: 'Completed' | 'Preparing';
  lines: DemoOrderLine[];
  /**
   * Hour of the pickup window, shop-local. Only set for the live order — the
   * completed ones are historical and their window has long passed.
   */
  pickupHour?: number;
};

// Ordered newest-first, matching how every reader sorts them.
//
// One order is left in flight so the dashboard's active-order card has
// something to show on arrival; the rest are collected, which is what gives
// "Buy it again" its repeat counts. The ground beef appears in three separate
// orders deliberately — a repeat prompt with everything at "1×" doesn't
// demonstrate anything.
export const DEMO_ORDERS: DemoOrderSpec[] = [
  {
    daysAgo: 0,
    status: 'Preparing',
    lines: [{ slug: 'prosciutto-di-parma', qty: 1 }],
    pickupHour: 16,
  },
  {
    daysAgo: 7,
    status: 'Completed',
    lines: [
      { slug: 'ground-beef-pack-80-20', qty: 2 },
      { slug: 'beef-bone-marrow', qty: 1 },
    ],
  },
  {
    daysAgo: 21,
    status: 'Completed',
    lines: [{ slug: 'backyard-cookout-bundle', qty: 1 }],
  },
  {
    daysAgo: 38,
    status: 'Completed',
    lines: [
      { slug: 'ground-beef-pack-80-20', qty: 1 },
      { slug: 'prosciutto-di-parma', qty: 1 },
    ],
  },
  {
    daysAgo: 59,
    status: 'Completed',
    lines: [{ slug: 'steakhouse-beef-sampler-bundle', qty: 1 }],
  },
  {
    daysAgo: 86,
    status: 'Completed',
    lines: [{ slug: 'ground-beef-pack-80-20', qty: 3 }],
  },
];

/**
 * How far back the seeded history reaches, in days.
 *
 * The reset back-dates `tierAnniversaryAt` by this much so the whole history
 * sits inside the qualifying window. Stamping the anniversary at `now` — which
 * is what it did before there was any history — would put every seeded award
 * *before* the period start, and `getQualifyingPoints` only counts entries
 * inside it: the tier bar would read 0 while the balance read 420.
 */
export const DEMO_HISTORY_DAYS =
  Math.max(...DEMO_ORDERS.map((o) => o.daysAgo)) + 4;
