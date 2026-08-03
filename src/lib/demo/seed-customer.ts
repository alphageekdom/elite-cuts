import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import ShopHoursModel, {
  DEFAULT_DAYS,
  type ShopHoursDay,
} from '@/models/ShopHours';
import SavedCard from '@/models/SavedCard';
import { TAX_RATE } from '@/lib/checkout/totals';
import { unitPrice } from '@/lib/products/pricing';
import { computeAward } from '@/lib/rewards/calculator';
import { DEMO_SHOP_SETTINGS } from './seed/settings';
import { shopDateKey } from '@/lib/shop-settings/pickup-format';
import { DEMO_ORDERS } from './seed/orders';
import {
  DEMO_ADDRESSES,
  DEMO_CARDS,
  DEMO_SAVED_CUT_SLUGS,
  type DemoAddressSpec,
} from './seed/customer';

// Rebuilds the demo customer's account state after the nightly wipe: order
// history, saved cuts, saved cards and addresses.
//
// Runs *after* `restoreDemoCatalog`, not before: the restore upserts products
// on their natural key, and both order lines and saved cuts hold product ids,
// so seeding first would race the step that settles those ids.
//
// Every order line is priced from the live product rather than from a number
// written into the seed, so a demo admin who reprices a cut mid-session sees
// the history re-price with it the next morning instead of drifting away from
// the catalog it references. Points follow from those same subtotals through
// `computeAward` — the function the production earn path calls — so a ledger
// row can never contradict the rate the rewards tab prints above it.

export type CustomerSeedCounts = {
  ordersSeeded: number;
  /** Ledger entries written, one per fulfilled order. */
  pointsEntriesSeeded: number;
  savedCutsSeeded: number;
  savedCardsSeeded: number;
  addressesSeeded: number;
};

export const emptyCustomerSeedCounts = (): CustomerSeedCounts => ({
  ordersSeeded: 0,
  pointsEntriesSeeded: 0,
  savedCutsSeeded: 0,
  savedCardsSeeded: 0,
  addressesSeeded: 0,
});

/** A points-history entry shaped for `User.pointsHistory`. */
export type SeededPointsEntry = {
  delta: number;
  reason: 'order_fulfilled';
  orderId: Types.ObjectId;
  expiresAt: null;
  createdAt: Date;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * UTC midnight of the shop's calendar day containing `instant`.
 *
 * The two helpers below do calendar arithmetic, and a calendar day belongs to
 * the shop, not the runtime. Encoding it as a UTC-midnight Date lets them use
 * `getUTC*` throughout and come out the same on any deploy — the same shape
 * `mondayOfShopDay` uses for week keys.
 */
function shopDayStart(timezone: string, instant: Date): Date {
  const [year, month, day] = shopDateKey(timezone, instant).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * `2026-07-28T16:00` — shop-local wall time, no zone, matching the picker.
 *
 * Reads `day` with UTC getters because it is a shop calendar day encoded as
 * UTC midnight. Reading it locally stamped the runtime's date instead: on a UTC
 * deploy a Saturday-evening seed produced a Sunday slot on an order every
 * shop-clock surface dates to Saturday, so the cut-list board — which bounds
 * the day through `slotRangeForDay` — never showed it.
 */
function pickupSlotId(day: Date, hour: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${pad(hour)}:00`;
}

/**
 * The first day from `from` on which the shop is actually open.
 *
 * The in-flight seeded order books a slot on the day it is placed, which is
 * "today". Mondays are closed under the default hours, so every Monday the
 * demo's active-order card advertised a pickup window on a day the shop is
 * shut. Rolls forward at most a week, then gives up and returns the original
 * day rather than looping — a shop closed all seven days has no honest answer
 * and is not a state the seed should invent one for.
 */
function nextOpenDay(from: Date, days: ShopHoursDay[]): Date {
  if (days.length === 0) return from;
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(from.getTime());
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    // Shop hours index 0 = Monday; `getUTCDay()` indexes 0 = Sunday. UTC
    // throughout because `from` is a shop calendar day encoded as UTC midnight
    // — reading the weekday off the runtime instead picked tomorrow's row for
    // every evening after shop-midnight elsewhere, so a Sunday seed could skip
    // an open Sunday as though it were closed Monday.
    const mondayIndex = (candidate.getUTCDay() + 6) % 7;
    if (!days.find((d) => d.dayOfWeek === mondayIndex)?.isClosed) {
      return candidate;
    }
  }
  return from;
}

export async function seedDemoOrders(
  demoCustomerId: Types.ObjectId,
  now: Date = new Date(),
): Promise<{ counts: CustomerSeedCounts; pointsHistory: SeededPointsEntry[] }> {
  await connectDB();

  // Read from the same snapshot `restoreDemoCatalog` just wrote, not through
  // `getShopSettings` — that helper calls `connection()` and so only works
  // inside a request scope, which the nightly cron's own call stack has but a
  // direct invocation does not. The snapshot is the value in the database at
  // this point anyway, for the earn rate as much as the pickup location.
  const pickupLocation = DEMO_SHOP_SETTINGS.shopName;

  const slugs = [
    ...new Set(DEMO_ORDERS.flatMap((o) => o.lines.map((l) => l.slug))),
  ];
  const products = await Product.find({ slug: { $in: slugs } }).lean();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // Real trading days, so the in-flight order's pickup window can't land on a
  // day the shop is shut. Falls back to the model defaults on a database with
  // no hours document yet.
  const hoursDoc = await ShopHoursModel.findOne().select('days').lean();
  const shopHours: ShopHoursDay[] = hoursDoc?.days?.length
    ? hoursDoc.days
    : DEFAULT_DAYS;

  const docs: Record<string, unknown>[] = [];
  // productId -> units this seeded history consumes. Drives the stock decrement
  // after the insert; see the comment there for why it exists.
  const takenByProduct = new Map<string, number>();
  const awards: { index: number; delta: number; createdAt: Date }[] = [];

  // Chronological, oldest first — the table is authored newest-first because
  // that is how every reader sorts it, but insertion order decides the order
  // *reference*. An ObjectId carries an incrementing counter and `insertMany`
  // allocates them in array order, so seeding newest-first gave the newest
  // order the lowest reference: a customer's May order read #EC-5DA0 while
  // their July one read #EC-5D9B, as though May came later.
  //
  // `awards[].index` points into `docs`, which is built in this same loop, and
  // `insertMany` returns in input order — so the ledger mapping stays aligned.
  // The ledger's own array order is irrelevant either way: `getEffectiveBalance`
  // re-sorts by `createdAt`.
  for (const spec of [...DEMO_ORDERS].reverse()) {
    const lines = spec.lines
      .map((line) => {
        const product = bySlug.get(line.slug);
        if (!product) return null;
        // The per-unit estimate the cart itself would snapshot — not the raw
        // `price`, which for a per-pound cut is a rate rather than a line
        // total. Getting this wrong is the bug that once charged $39.99 for a
        // half-pound filet.
        const unit = round2(unitPrice(product, product.price));
        return {
          product: product._id,
          name: product.name,
          qty: line.qty,
          image: product.images?.[0] ?? '',
          price: unit,
          productType: product.category,
          refunded: false,
          pricingType: product.pricingType,
          pricePerLb: product.pricePerLb,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    // A cut that has been renamed out of the catalog takes its order with it
    // rather than producing an empty one, which the schema rejects anyway.
    if (lines.length === 0) continue;

    const placedAt = new Date(now.getTime());
    placedAt.setDate(placedAt.getDate() - spec.daysAgo);

    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    );
    const tax = round2(subtotal * TAX_RATE);
    const totalCost = round2(subtotal + tax);
    const isCompleted = spec.status === 'Completed';

    // The production earn path, not a number written into the seed. Points are
    // awarded on fulfilment, so an order still in flight has earned nothing —
    // and a completed one earns exactly what the rate above the ledger says it
    // should. `placedAt` doubles as the fulfilment instant for these, which is
    // what `readyAt` / `pickedUpAt` below are stamped with.
    //
    // `computeAward` reads day-of-week for the weekend multiplier. The seeded
    // dates are offsets from the run, so a given order lands on a different
    // weekday each night — correct behaviour, and a no-op while the snapshot's
    // multiplier is 1.
    const pointsAwarded = isCompleted
      ? computeAward(subtotal, DEMO_SHOP_SETTINGS, placedAt)
      : 0;

    // Accumulated here, where `lines` is still typed, rather than by re-walking
    // `docs` afterwards — that array is `Record<string, unknown>[]`, so reading
    // it back needs a cast that would silently outlive any change to the shape.
    for (const line of lines) {
      const key = String(line.product);
      takenByProduct.set(key, (takenByProduct.get(key) ?? 0) + line.qty);
    }

    docs.push({
      user: demoCustomerId,
      orderItems: lines,
      subtotal,
      tax,
      totalCost,
      isPaid: true,
      paidAt: placedAt,
      orderStatus: spec.status,
      paymentMethod: 'Credit Card',
      paymentResult: {
        status: 'Completed',
        provider: 'demo',
        amountPaid: totalCost,
        currency: 'USD',
        paymentDate: placedAt,
      },
      fulfillmentType: 'pickup',
      pickupLocation,
      ...(spec.pickupHour !== undefined
        ? {
            pickupSlot: pickupSlotId(
              nextOpenDay(
                shopDayStart(DEMO_SHOP_SETTINGS.timezone, placedAt),
                shopHours,
              ),
              spec.pickupHour,
            ),
          }
        : {}),
      pickedUp: isCompleted,
      ...(isCompleted ? { readyAt: placedAt, pickedUpAt: placedAt } : {}),
      pointsAwarded,
      createdAt: placedAt,
      updatedAt: placedAt,
    });

    if (pointsAwarded > 0) {
      awards.push({
        index: docs.length - 1,
        delta: pointsAwarded,
        createdAt: placedAt,
      });
    }
  }

  if (docs.length === 0) {
    return { counts: emptyCustomerSeedCounts(), pointsHistory: [] };
  }

  // `timestamps: false` so the seeded createdAt values survive — Mongoose
  // would otherwise stamp every order with "now" and collapse the history
  // into a single day, taking the habit stats and the ledger dates with it.
  const inserted = await Order.insertMany(docs, { timestamps: false });

  // Take the stock these orders represent.
  //
  // The seed writes `paymentResult.status: 'Completed'` but used to leave
  // `stockCount` untouched, so the seeded state was internally inconsistent:
  // `hasSettledPayment` answers true for these orders, and the admin cancel path
  // reads exactly that to decide whether to restock. Cancelling a seeded order
  // therefore ran `$inc: { stockCount }` for stock that had never been taken,
  // inflating the catalog — the demo minting inventory out of its own history.
  //
  // Bounded before (the nightly restore rewrites `stockCount` from the snapshot)
  // but bounded is not correct, and an admin who cancels two seeded orders
  // between resets sees the number climb. Decrementing here makes the seeded
  // state match what a real order would have left behind, which is the thing the
  // cancel path is entitled to assume.
  //
  // Floored at zero: the seeded history is generated against a snapshot that
  // does not reserve stock, so a popular cut can legitimately appear in more
  // seeded orders than it has units. Going negative would break the catalog's
  // in-stock rendering for the sake of an arithmetic purity nothing reads.
  if (takenByProduct.size > 0) {
    await Product.bulkWrite(
      [...takenByProduct].map(([productId, qty]) => ({
        updateOne: {
          filter: { _id: productId },
          update: [
            {
              $set: {
                stockCount: {
                  $max: [0, { $subtract: ['$stockCount', qty] }],
                },
              },
            },
          ],
        },
      })),
    );
  }

  const pointsHistory: SeededPointsEntry[] = awards.map((award) => ({
    delta: award.delta,
    reason: 'order_fulfilled' as const,
    orderId: inserted[award.index]._id as Types.ObjectId,
    // Nightly rewrite means an expiry date would only ever be noise.
    expiresAt: null,
    createdAt: award.createdAt,
  }));

  return {
    counts: {
      ...emptyCustomerSeedCounts(),
      ordersSeeded: inserted.length,
      pointsEntriesSeeded: pointsHistory.length,
    },
    pointsHistory,
  };
}

/**
 * Product ids for the saved-cuts list.
 *
 * Returns ids rather than writing them, because `savedCuts` is an array on the
 * User document and the reset already has one update in flight for that doc —
 * a second write would be a needless round trip against the same record.
 *
 * A slug that no longer resolves is simply absent. The saved-cuts UI renders
 * from a product lookup, so a dangling id would show as a gap in the grid.
 */
export async function resolveDemoSavedCuts(): Promise<Types.ObjectId[]> {
  await connectDB();
  const docs = await Product.find({
    slug: { $in: [...DEMO_SAVED_CUT_SLUGS] },
  })
    .select('_id slug')
    .lean<{ _id: Types.ObjectId; slug: string }[]>();

  const bySlug = new Map(docs.map((d) => [d.slug, d._id]));
  // Seed order, not Mongo's — the saved list reads as a list the customer
  // built, so the order it was written in is the meaningful one.
  return DEMO_SAVED_CUT_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (id): id is Types.ObjectId => Boolean(id),
  );
}

/**
 * Address subdocuments for the User doc.
 *
 * Pure — same reasoning as saved cuts, these ride along on the update the
 * reset is already making.
 */
export function buildDemoAddresses(): DemoAddressSpec[] {
  return DEMO_ADDRESSES.map((address) => ({ ...address }));
}

/**
 * Saved cards, written to their own collection.
 *
 * The wipe deletes the demo customer's cards first, so re-inserting the same
 * fixed `stubCardId` values can't collide with the rows just removed — and the
 * ids are namespaced so they can't collide with a real customer's either.
 *
 * Expiry is computed forward from the run date rather than written as a
 * literal year, so a seeded card can never age into the red "Expired" pill the
 * payment-methods list shows on a past-expiry card.
 */
export async function seedDemoCards(
  demoCustomerId: Types.ObjectId,
  now: Date = new Date(),
): Promise<number> {
  await connectDB();
  if (DEMO_CARDS.length === 0) return 0;

  const docs = DEMO_CARDS.map((card) => ({
    user: demoCustomerId,
    stubCardId: card.stubCardId,
    cardholderName: card.cardholderName,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: now.getFullYear() + card.expiresInYears,
  }));

  const inserted = await SavedCard.insertMany(docs);
  return inserted.length;
}

/**
 * One post-restore step covering everything the demo customer owns.
 *
 * The caller writes `savedCuts`, `addresses` and `pointsHistory` onto the User
 * doc in a single update; orders and cards have already been written to their
 * own collections by the time this returns.
 */
export async function seedDemoCustomerData(
  demoCustomerId: Types.ObjectId,
  now: Date = new Date(),
): Promise<{
  counts: CustomerSeedCounts;
  pointsHistory: SeededPointsEntry[];
  savedCuts: Types.ObjectId[];
  addresses: DemoAddressSpec[];
}> {
  // Cards before orders, deliberately. The caller's ledger write only runs
  // after this whole function returns, and an account holding seeded orders
  // with the fallback single-row ledger contradicts itself on the rewards
  // tab. Ordering the fallible writes so the orders insert is the LAST one
  // shrinks that incoherent window to exactly one statement: a throw at the
  // cards leaves an empty-but-coherent account, a throw at the orders leaves
  // cards-but-no-orders (also coherent), and only a failure of the caller's
  // own final write can now produce the contradiction. `seedDemoCards` takes
  // the customer id alone — nothing about it depends on the orders existing.
  const savedCardsSeeded = await seedDemoCards(demoCustomerId, now);
  const savedCuts = await resolveDemoSavedCuts();
  const addresses = buildDemoAddresses();
  const orders = await seedDemoOrders(demoCustomerId, now);

  return {
    counts: {
      ...orders.counts,
      savedCutsSeeded: savedCuts.length,
      savedCardsSeeded,
      addressesSeeded: addresses.length,
    },
    pointsHistory: orders.pointsHistory,
    savedCuts,
    addresses,
  };
}
