import 'server-only';

import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import SavedCard from '@/models/SavedCard';
import Notification from '@/models/Notification';
import Review from '@/models/Review';
import Message from '@/models/Message';
import { recomputeProductRating } from '@/lib/reviews/recompute';
import {
  restoreDemoCatalog,
  emptyCatalogCounts,
  type CatalogCounts,
} from './restore';
import {
  seedDemoCustomerData,
  emptyCustomerSeedCounts,
  type CustomerSeedCounts,
} from './seed-customer';
import { DEMO_HISTORY_DAYS } from './seed/orders';

/**
 * Balance left behind when `resetDemoCustomerState` runs on its own.
 *
 * Not the number the demo actually opens with — `resetDemoData` seeds order
 * history and overwrites this with the sum of what those orders earned at the
 * shop's configured rate. It exists so the standalone function still leaves a
 * coherent account: points are only ever awarded when an admin fulfils an
 * order, and order writes are closed to demo admins, so a demo customer at
 * zero could never earn one and the rewards half of the shop would be
 * undemonstrable.
 *
 * Deliberately not quoted anywhere customer-facing. It used to be, as
 * `DEMO_STARTING_POINTS` on /demo, which is what let a fixed balance drift
 * away from the history underneath it.
 */
export const DEMO_FALLBACK_POINTS = 420;

// Per-collection touch counts returned by `resetDemoCustomerState`. The
// values are surfaced verbatim in the cron + admin endpoints so a manual
// trigger can confirm a normal reset ran without combing the server logs.
export type ResetCounts = {
  ordersDeleted: number;
  cartDeleted: number;
  savedCardsDeleted: number;
  notificationsDeleted: number;
  reviewsDeleted: number;
  messagesDeleted: number;
  // The User document itself stays — only its derived state is reset. `true`
  // when the demo customer's saved cuts / addresses / rewards / dormancy
  // fields were reset to the zero state on this run.
  userReset: boolean;
};

// Shape returned by `resetDemoData` — surfaced by the cron + admin endpoint
// so the toast / log can report what the run actually cleared.
export type DemoResetCounts = ResetCounts & CatalogCounts & CustomerSeedCounts;

// Idempotent wipe of every Mongo record owned by the seeded demo customer.
// Composed by `resetDemoData` below alongside `restoreDemoCatalog`; the
// cron route and admin "Reset demo data" button both call the top-level
// orchestrator so the two paths can't drift on either side.
//
// Scope is by document ownership (`user === demoCustomerId`,
// `userId === demoCustomerId`) — the owned collections don't carry their
// own `isDemo` column; admin surfaces that need to flag a row as demo
// (e.g. the orders table) read it from the populated user instead. Audit
// logs (AccountDeletionAudit) are deliberately untouched per the Phase
// C spec.
//
// Returns zeros on every count if the demo customer doesn't exist
// (a fresh DB where the seed hasn't run yet) so the cron / admin call
// succeeds gracefully instead of throwing.
export async function resetDemoCustomerState(): Promise<ResetCounts> {
  await connectDB();

  const demo = await User.findOne({
    isDemo: true,
    demoType: 'customer',
  }).select('_id');

  if (!demo) {
    return {
      ordersDeleted: 0,
      cartDeleted: 0,
      savedCardsDeleted: 0,
      notificationsDeleted: 0,
      reviewsDeleted: 0,
      messagesDeleted: 0,
      userReset: false,
    };
  }

  const demoId = demo._id;

  // BOTH demo accounts own storefront rows, not just the customer.
  //
  // Nothing stops a session signed in as the demo admin from shopping: the
  // catalog, cart, checkout, reviews and messages are all open to any signed-in
  // user, and the no-charge checkout tile enables itself for any `isDemo`
  // account. Scoping this wipe to the customer alone left everything a visitor
  // did while exploring the ADMIN demo behind permanently — orders that also
  // counted in every revenue figure, reviews sitting on the public catalog, and
  // a cart plus conversation the next visitor to that shared account inherited.
  //
  // Absent on an install seeded before the admin demo account existed, so the
  // list is built defensively rather than assuming both are present.
  const demoAdmin = await User.findOne({
    isDemo: true,
    demoType: 'admin',
  }).select('_id');
  const demoAdminId = demoAdmin?._id ?? null;
  const ownerIds = [demoId, ...(demoAdminId ? [demoAdminId] : [])];

  // Reviews either demo account *authored*. These are public — they render on
  // the product page for every later visitor — and nothing else in the reset
  // removed them, so a single demo session used to leave a permanent mark on
  // the catalog. Collect the affected product ids before the delete so their
  // ratings can be recomputed from what survives.
  const authoredReviews = await Review.find({ user: { $in: ownerIds } })
    .select('product')
    .lean<{ product: typeof demoId }[]>();
  const reviewedProductIds = [
    ...new Set(authoredReviews.map((r) => String(r.product))),
  ];
  const reviewsRes = await Review.deleteMany({ user: { $in: ownerIds } });

  // Owned collections — straight deleteMany by owner field. Two exceptions:
  //
  // Helpful votes don't belong to the demo customer, they live on shared
  // Review docs (which survive the reset), so a demo session's votes would
  // otherwise permanently reshuffle the "Most helpful" badge for every later
  // visitor. Pull the demo id out of every review's voter list.
  //
  // Messages the demo customer sent the shop are visible to the next demo
  // visitor on the profile page and to every admin in the messages tab, and
  // nothing else in the reset removed them — a single session used to leave a
  // permanent conversation behind, which is also what the privacy page's
  // "visible to the next visitor until the nightly reset clears it" promises
  // against. Notifications are cleared for the demo admin too: every order the
  // demo customer places fans out an alert to all admins, so the demo admin's
  // bell would otherwise accumulate forever, pointing at orders this same
  // reset just deleted.
  const [ordersRes, cartRes, savedCardsRes, notificationsRes, messagesRes] =
    await Promise.all([
      Order.deleteMany({ user: { $in: ownerIds } }),
      Cart.deleteMany({ user: { $in: ownerIds } }),
      SavedCard.deleteMany({ user: { $in: ownerIds } }),
      Notification.deleteMany({ userId: { $in: ownerIds } }),
      Message.deleteMany({ user: { $in: ownerIds } }),
      Review.updateMany(
        { helpfulVoters: { $in: ownerIds } },
        { $pull: { helpfulVoters: { $in: ownerIds } } },
      ),
    ]);

  // The demo admin's own storefront leftovers. Only the shopping fields are
  // cleared — its admin identity and flags are untouched, and it gets no
  // rewards seed because the account is there to demonstrate the dashboard,
  // not the loyalty programme.
  if (demoAdminId) {
    await User.updateOne(
      { _id: demoAdminId },
      { $set: { savedCuts: [], addresses: [] } },
    );
  }

  // Embedded state on the User doc. Clearing here also resets the dormancy
  // bookkeeping so a long stretch with no demo activity doesn't trip
  // Phase B's scan exclusion into anything unexpected. `isDemo` and
  // `demoType` are immutable in the schema, so they don't need to be set.
  //
  // Rewards are seeded rather than zeroed — see `DEMO_FALLBACK_POINTS` for
  // why a demo customer can never earn a point on their own.
  //
  // Both the balance and the single entry written here are a fallback.
  // `resetDemoData` replaces them with one entry per seeded order and the sum
  // of what those orders earned, so every row is a real award against a real
  // order rather than one row captioned "Adjustment" with nothing behind it.
  // Calling this function on its own still leaves a coherent account, which is
  // what the fallback is for.
  const now = new Date();
  // Back-dated so the seeded order history sits inside the qualifying window.
  // `getQualifyingPoints` only counts entries at or after the period start, so
  // an anniversary stamped `now` would leave the tier bar reading zero beside
  // a non-zero balance.
  const periodStart = new Date(now.getTime());
  periodStart.setDate(periodStart.getDate() - DEMO_HISTORY_DAYS);

  await User.updateOne(
    { _id: demoId },
    {
      $set: {
        savedCuts: [],
        addresses: [],
        rewardPoints: DEMO_FALLBACK_POINTS,
        lifetimePoints: DEMO_FALLBACK_POINTS,
        // `order_fulfilled` is the only reason that counts toward tier
        // qualification. `expiresAt: null` keeps it out of the expiry sweep —
        // the balance is rewritten nightly anyway, so an expiry date would
        // only ever be noise.
        pointsHistory: [
          {
            delta: DEMO_FALLBACK_POINTS,
            reason: 'order_fulfilled',
            expiresAt: null,
            createdAt: now,
          },
        ],
        tierAnniversaryAt: periodStart,
        currentTier: null,
        dormancyWarnedAt: null,
        lastActiveAt: null,
        adminNote: 'Portfolio demo account — guarded by isDemo flag.',
      },
    },
  );

  // Ratings are an average over surviving reviews, so every product the demo
  // customer reviewed needs one recompute now that those rows are gone.
  await Promise.all(reviewedProductIds.map((id) => recomputeProductRating(id)));

  return {
    ordersDeleted: ordersRes.deletedCount ?? 0,
    cartDeleted: cartRes.deletedCount ?? 0,
    savedCardsDeleted: savedCardsRes.deletedCount ?? 0,
    notificationsDeleted: notificationsRes.deletedCount ?? 0,
    reviewsDeleted: reviewsRes.deletedCount ?? 0,
    messagesDeleted: messagesRes.deletedCount ?? 0,
    userReset: true,
  };
}

// Top-level orchestrator for the nightly cron + admin "Reset demo data"
// button. Wipes the demo customer's owned state, then restores the shared
// catalog and shop config from the seed snapshot.
//
// This file previously carried a note claiming a catalog restore was not
// viable, because re-seeding products "orphans the reviews that point at
// those product ids". That reasoning generalized from one implementation —
// delete and re-insert — to the whole problem. `restoreDemoCatalog` upserts
// on the natural key instead, so every restored row keeps its `_id` and
// nothing orphans. See the comment there for the full reference map.
//
// Order matters: the customer wipe recomputes ratings for products it removed
// reviews from, and the restore must not run before those reviews are gone.
export async function resetDemoData(): Promise<DemoResetCounts> {
  const customer = await resetDemoCustomerState();

  // No demo customer means the demo seed has never run here, and the catalog
  // restore would be doing something nobody asked for: overwriting this
  // install's products, staff, shifts and shop settings with a snapshot meant
  // for a demo that doesn't exist. Bail with zeroed catalog counts instead.
  if (!customer.userReset) {
    return {
      ...customer,
      ...emptyCatalogCounts(),
      ...emptyCustomerSeedCounts(),
    };
  }

  const catalog = await restoreDemoCatalog();

  // Order history goes back last, after the catalog restore has settled every
  // product `_id` an order line points at.
  const demo = await User.findOne({
    isDemo: true,
    demoType: 'customer',
  }).select('_id');

  if (!demo) {
    return { ...customer, ...catalog, ...emptyCustomerSeedCounts() };
  }

  const seeded = await seedDemoCustomerData(demo._id);

  // One write for everything that lives on the User document. Swapping the
  // fallback ledger entry for one row per seeded order is what makes the
  // rewards activity list name orders the customer can actually open, instead
  // of a single row captioned "Adjustment".
  //
  // The balance is the sum of those rows, not a constant they were reverse-
  // engineered to match. That is the whole point: the rewards tab prints the
  // configured earn rate directly above this ledger, and every row now follows
  // from a subtotal at that rate.
  const embedded: Record<string, unknown> = {
    savedCuts: seeded.savedCuts,
    addresses: seeded.addresses,
  };
  if (seeded.pointsHistory.length > 0) {
    const earned = seeded.pointsHistory.reduce((sum, e) => sum + e.delta, 0);
    embedded.pointsHistory = seeded.pointsHistory;
    embedded.rewardPoints = earned;
    // Lifetime is what drives the tier, and nothing has been redeemed on a
    // freshly reset account, so the two start equal.
    embedded.lifetimePoints = earned;
  }
  await User.updateOne({ _id: demo._id }, { $set: embedded });

  return { ...customer, ...catalog, ...seeded.counts };
}
