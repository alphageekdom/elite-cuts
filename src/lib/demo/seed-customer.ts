import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SavedCard from '@/models/SavedCard';
import { TAX_RATE } from '@/lib/pricing';
import { unitPrice } from '@/lib/products/pricing';
import { computeAward } from '@/lib/rewards/calculator';
import { DEMO_SHOP_SETTINGS } from './seed/settings';
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

/** `2026-07-28T16:00` — shop-local wall time, no zone, matching the picker. */
function pickupSlotId(day: Date, hour: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
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

  const docs: Record<string, unknown>[] = [];
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
        ? { pickupSlot: pickupSlotId(placedAt, spec.pickupHour) }
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
  const orders = await seedDemoOrders(demoCustomerId, now);
  const savedCuts = await resolveDemoSavedCuts();
  const addresses = buildDemoAddresses();
  const savedCardsSeeded = await seedDemoCards(demoCustomerId, now);

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
