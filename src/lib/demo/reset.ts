import 'server-only';

import { randomUUID } from 'crypto';

import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import SavedCard from '@/models/SavedCard';
import Notification from '@/models/Notification';
import Review from '@/models/Review';
import Message from '@/models/Message';
import DemoResetLock, {
  DEMO_RESET_LOCK_ID,
  DEMO_RESET_LOCK_STALE_AFTER_MS,
} from '@/models/DemoResetLock';
import type { DemoResetOutcome, DemoResetTrigger } from '@/models/DemoResetRun';
import { recomputeProductRating } from '@/lib/reviews/recompute';
import { deleteStripeCustomer } from '@/lib/payments/savedCards';
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
import { DEMO_ADMIN_FILTER, DEMO_CUSTOMER_FILTER, demoOwnerIds } from './accounts';
import { assertDemoResetTarget } from './target-guard';
import { planDemoReset, type DemoResetPlan } from './dry-run';
import { recordDemoResetRun, type DemoResetRunRecord } from './run-history';
import { verifyDemoState } from './verify';

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
  // Ratings whose recompute failed and was swallowed so the restore behind it
  // could still run (see the catch below). Counted rather than only logged so
  // `withCronSecret` can answer 500 — a run where every recompute failed used
  // to report a clean 200, which is the exact defect the other two crons'
  // `failureCount` exists to prevent.
  ratingRecomputeFailures: number;
  // Stripe Customers detached from the two demo accounts on this run. Expected
  // to be 0 on every run after the first: `getOrCreateStripeCustomer` no longer
  // creates one for a demo account, so this is a cleanup for ids that already
  // exist rather than an ongoing sweep.
  stripeCustomersCleared: number;
};

// Shape returned by `resetDemoData` — surfaced by the cron + admin endpoint
// so the toast / log can report what the run actually cleared.
//
// `validationFailures` rides along rather than living in its own return value
// so that every consumer that already destructures the counts sees it without
// changing shape. Empty on a healthy run; each entry is a `kind:identifier`
// string naming exactly what post-run verification could not find.
type DemoResetWorkCounts = ResetCounts & CatalogCounts & CustomerSeedCounts;

export type DemoResetCounts = DemoResetWorkCounts & {
  validationFailures: string[];
};

// The zero state, in one place. Two callers: the no-demo-customer early return
// below, and the cron route's lock-contention path, which needs a full
// `DemoResetCounts` so the wrapper's `failureCount` selector does not read
// `undefined` off a partial object and compute NaN.
export const emptyResetCounts = (): ResetCounts => ({
  ordersDeleted: 0,
  cartDeleted: 0,
  savedCardsDeleted: 0,
  notificationsDeleted: 0,
  reviewsDeleted: 0,
  messagesDeleted: 0,
  userReset: false,
  ratingRecomputeFailures: 0,
  stripeCustomersCleared: 0,
});

export const emptyDemoResetCounts = (): DemoResetCounts => ({
  ...emptyResetCounts(),
  ...emptyCatalogCounts(),
  ...emptyCustomerSeedCounts(),
  validationFailures: [],
});

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
// Returns zeros on every count if the demo customer doesn't exist, rather
// than throwing — a fresh database where the seed has not run yet is a
// coherent state for this function, not an error.
//
// **The overall RUN no longer succeeds in that case, and that is deliberate.**
// This comment used to end "so the cron / admin call succeeds gracefully",
// which stopped being true when post-run verification landed:
// `verifyDemoState` reports `account:demo-customer`, that feeds the cron's
// `failureCount`, and the endpoint answers 500.
//
// Kept that way on purpose. A demo with no demo accounts is broken, and saying
// so is the entire job of the verification pass — a quiet 200 over an empty
// shop is the "reported success on a failed run" defect this subsystem has
// already been bitten by twice. The cost lands only on a freshly seeded dev
// database, which does not run the cron; Vercel schedules it on Production
// only, and Production always has the demo seeded. See
// `docs/database-environments.md` for the bootstrap order.
export async function resetDemoCustomerState(): Promise<ResetCounts> {
  await connectDB();

  // Guarded here as well as in `resetDemoData`, even though the only caller
  // today is `runDemoReset` one screen down.
  //
  // This function is exported and destructive — an owner-scoped wipe of six
  // collections plus a Stripe Customer deletion — and nothing about its
  // signature says a guard is required. A future caller (a script, a server
  // action, a repair endpoint) would get an unguarded path to production with
  // no compile-time signal. The check is a string comparison against an env
  // var; making it a property of the function rather than of one caller costs
  // nothing and removes the class of mistake.
  assertDemoResetTarget();

  const demo = await User.findOne(DEMO_CUSTOMER_FILTER).select(
    '_id stripeCustomerId',
  );

  if (!demo) {
    return emptyResetCounts();
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
  const demoAdmin = await User.findOne(DEMO_ADMIN_FILTER).select(
    '_id stripeCustomerId',
  );
  const demoAdminId = demoAdmin?._id ?? null;
  const ownerIds = demoOwnerIds(demo, demoAdmin);

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

  // Recompute IMMEDIATELY after the delete, not at the end of the wipe. The
  // worklist above derives from rows the delete just destroyed, so it cannot
  // be rebuilt: a throw anywhere between the delete and a deferred recompute
  // used to strand the wrong ratings permanently — the next night's run finds
  // no authored reviews and recomputes nothing, and the catalog restore
  // deliberately never writes `rating`. Per-product catch so one transient
  // failure stales one rating (visibly, in the log) instead of aborting the
  // ~100 restore round-trips behind it.
  let ratingRecomputeFailures = 0;
  await Promise.all(
    reviewedProductIds.map((id) =>
      recomputeProductRating(id).catch((error) => {
        ratingRecomputeFailures += 1;
        console.error('[demo reset] rating recompute failed', id, error);
      }),
    ),
  );

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

  // Stripe Customers attached to either demo account.
  //
  // The `SavedCard` delete above only clears the LOCAL mirror. Anything a
  // visitor saved through Stripe's hosted page attaches to a Stripe Customer,
  // and the two demo accounts are shared by every visitor for the life of the
  // deploy — so that Customer's PaymentMethod list grew without bound while the
  // profile tab, reading the wiped mirror, showed nothing. Deleting the
  // Customer takes its cards with it, which is what the profile's per-card
  // delete does one at a time.
  //
  // `deleteStripeCustomer` never throws and no-ops in stub mode, so this cannot
  // fail the run — matching the account-deletion cascade's reasoning, and the
  // reason this is safe in a nightly job on a platform that does not retry. A
  // Stripe failure leaves the object orphaned, which the helper logs.
  //
  // The local id is cleared regardless of whether Stripe answered. Leaving it
  // would let the next session attach cards to a Customer this run has already
  // asked Stripe to delete.
  //
  // Ordering: Stripe first, then the local unset. That is the right order for a
  // CRASH between the two — the id survives and the next night tries again.
  //
  // It is **not** a retry path for a Stripe API failure, which is what this
  // comment used to claim. `deleteStripeCustomer` swallows its errors and
  // returns void, so the `$unset` below runs either way: a failed delete
  // orphans the Customer and destroys the pointer in the same run, and the log
  // line inside that helper is the only remaining record of the id. The
  // sentence above it here said the opposite while the line three above said
  // "cleared regardless" — both could not be true.
  //
  // Accepted rather than fixed: making the unset conditional would mean
  // `deleteStripeCustomer` reporting an outcome, which it deliberately does not
  // (see its header). These are test-mode Customers on two shared demo
  // accounts, so an orphan costs nothing real.
  //
  // Expected to be a no-op after the first run: `getOrCreateStripeCustomer`
  // returns null for `isDemo` accounts, so no new Customer is ever minted.
  const stripeHolders = [demo, demoAdmin].filter(
    (u): u is NonNullable<typeof u> => Boolean(u?.stripeCustomerId),
  );
  for (const holder of stripeHolders) {
    await deleteStripeCustomer(holder.stripeCustomerId);
  }
  if (stripeHolders.length > 0) {
    await User.updateMany(
      { _id: { $in: stripeHolders.map((u) => u._id) } },
      { $unset: { stripeCustomerId: '' } },
    );
  }

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

  return {
    ordersDeleted: ordersRes.deletedCount ?? 0,
    cartDeleted: cartRes.deletedCount ?? 0,
    savedCardsDeleted: savedCardsRes.deletedCount ?? 0,
    notificationsDeleted: notificationsRes.deletedCount ?? 0,
    reviewsDeleted: reviewsRes.deletedCount ?? 0,
    messagesDeleted: messagesRes.deletedCount ?? 0,
    userReset: true,
    ratingRecomputeFailures,
    stripeCustomersCleared: stripeHolders.length,
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
//
// Serialised by an advisory lock. The cron and the admin button are
// independent triggers, Vercel documents occasional duplicate cron
// invocations, and nothing in the ~110 sequential writes below tolerates an
// interleaved twin: both runs wipe orders at the start and seed them at the
// end, so any overlap doubles the order history against a single ledger, and
// the staff insert-then-prune pair can mutually delete each other's inserts
// down to an empty roster. The loser of the claim throws rather than
// pretending to have reset anything — its caller answers 500, which is true:
// that invocation did no work.
//
// ── Transaction boundaries: there are none, on purpose ──────────────────
// `withOptionalTransaction` exists in this codebase (`src/lib/db/transaction.ts`)
// and three routes use it. It is deliberately NOT used here, and the reasons
// are recorded rather than rediscovered:
//
//   * **It would not fit.** MongoDB's `transactionLifetimeLimitSeconds`
//     defaults to 60s. This job is ~110 sequential round-trips and runs under a
//     300s function ceiling — which the route declares to stop a change to the
//     project default lowering it, not because 300 was raised for this job (300
//     IS the platform default; see the note on `maxDuration` there). Either way
//     the run is permitted to take minutes and sometimes does, so a transaction
//     spanning it would abort partway through on a slow night — converting an
//     ordinary partial failure into a guaranteed total one.
//   * **The unit of work is not one document set.** The run spans most of the
//     schema — take the list from the imports at the top of this file and
//     `restore.ts` rather than from a number here, which is how "twelve
//     collections" sat in this comment while the real figure was thirteen. It
//     also interleaves third-party calls (Cloudinary image deletion, and now
//     Stripe) that no database transaction can roll back. A "transactional"
//     reset would still leave those half-done while reporting atomicity, which
//     is worse than reporting neither.
//   * **Idempotence is the better property, and this run already has it.**
//     Proved against a real database on 2026-07-25. Re-running repairs a
//     partial state; a rollback merely returns to the previous partial state,
//     which for a reset is the *broken* one it was invoked to fix.
//
// **Stated partial-failure behaviour**, which is what the spec actually asks
// for: a throw anywhere aborts the remaining steps, leaves everything already
// written in place, releases the lock, records a `failure` row in the run
// history, and answers 500. The demo is then in a mixed state until the next
// run — nightly by cron, or immediately via the admin button or the CLI. The
// two orderings that would make a mixed state *visibly broken* rather than
// merely stale are handled individually where they occur, each with its own
// note: the staff roster inserts before it prunes, and the shift week upserts
// before it prunes, so neither can leave the schedule blank for a day.
//
// The two writes that are genuinely atomic are the ones that need to be, and
// they get there without a transaction: the lock claim is a single
// `findOneAndUpdate` upsert, and each product restore is one `save()`.
export type DemoResetOptions = {
  /** Recorded verbatim in the run history. */
  trigger: DemoResetTrigger;
};

export async function resetDemoData(
  options: DemoResetOptions,
): Promise<DemoResetCounts> {
  await connectDB();

  // Before the lock claim, which is itself a write. Throws
  // `DemoResetTargetError` when the connected database is not the one this
  // environment declared — see `./target-guard` for why that cannot be
  // inferred and has to be configured.
  const database = assertDemoResetTarget();

  const startedAt = new Date();
  const runId = randomUUID();

  // The three history writes below differ only in outcome, counts and error;
  // everything else is fixed for the invocation. Closed over rather than
  // copied, so the three cannot drift on `database` or `runId` — which would
  // be invisible, because a row with the wrong id still looks like a row.
  const record = (
    outcome: DemoResetOutcome,
    extra: Partial<Pick<DemoResetRunRecord, 'counts' | 'validationFailures' | 'error'>> = {},
  ) =>
    recordDemoResetRun({
      runId,
      trigger: options.trigger,
      outcome,
      startedAt,
      finishedAt: new Date(),
      database,
      counts: {},
      validationFailures: [],
      error: null,
      ...extra,
    });

  const now = startedAt;
  try {
    // Claims a free lock, or steals one whose holder started longer ago than
    // any live run can still be working (see the model for the arithmetic).
    // A fresh held lock matches neither branch, so the upsert collides with
    // the existing `_id` — that duplicate-key throw is the "already running"
    // signal, not an error in the usual sense.
    await DemoResetLock.findOneAndUpdate(
      {
        _id: DEMO_RESET_LOCK_ID,
        $or: [
          { heldSince: null },
          { heldSince: { $lt: new Date(now.getTime() - DEMO_RESET_LOCK_STALE_AFTER_MS) } },
        ],
      },
      { $set: { heldSince: now } },
      { upsert: true },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Safe to record because THIS invocation verified the target a few lines
      // up, before ever reaching the lock — not, as this comment first said,
      // because whichever run holds the lock verified it. That reasoning leaned
      // on another process; this one does not need to.
      //
      // Worth writing at all because it is the only way a skipped night is
      // distinguishable afterwards from a night the cron never fired.
      await record('skipped');
      throw new DemoResetInProgressError();
    }
    throw error;
  }

  try {
    const counts = await runDemoReset();

    // Verify the state the run claims to have produced. "The steps ran" and
    // "the demo works" are different claims and only the first was ever
    // checked — see `./verify` for what is asserted and why it is asserted
    // against identifiers rather than counts.
    //
    // A verification failure fails the run: `validationFailures` feeds the cron
    // wrapper's `failureCount`, so the endpoint answers 500 and the row below
    // records `failure`. It runs after the work rather than instead of it — a
    // partially restored demo is still better than none, and the operator needs
    // to know which identifiers are missing, not merely that something is.
    const failures = await verifyDemoState();
    if (failures.length > 0) {
      console.error(
        `[demo reset] post-run verification failed: ${failures.join(', ')}`,
      );
    }

    const result = { ...counts, validationFailures: failures };

    await record(
      failures.length > 0 || counts.ratingRecomputeFailures > 0
        ? 'failure'
        : 'success',
      { counts, validationFailures: failures },
    );

    return result;
  } catch (error) {
    await record('failure', { error });
    throw error;
  } finally {
    // Release even when the reset throws — the stale-takeover threshold is
    // the backstop for a crashed process, not the routine path. A failed
    // release is swallowed on purpose: surfacing it would mask the reset's
    // own error, and the stale threshold makes the lock self-healing.
    await DemoResetLock.updateOne(
      { _id: DEMO_RESET_LOCK_ID },
      { $set: { heldSince: null } },
    ).catch((releaseError) => {
      console.error('[demo reset] lock release failed', releaseError);
    });
  }
}

/**
 * Reports what `resetDemoData` would do, without doing any of it.
 *
 * A SECOND entry point, not a path through `resetDemoData` — it calls
 * `assertDemoResetTarget` itself, a few lines down. That distinction matters:
 * the guard's protection here rests on this call, and deleting it would let a
 * dry run reach an undeclared database while `resetDemoData` still looked
 * protected. Both entry points check; neither delegates to the other.
 *
 * It takes no lock and writes no records — one history row, and whatever
 * `autoIndex` builds on first model import. See `./dry-run` for what it
 * deliberately cannot predict.
 */
export async function dryRunDemoReset(
  options: DemoResetOptions,
): Promise<DemoResetPlan> {
  await connectDB();

  const database = assertDemoResetTarget();
  const startedAt = new Date();
  const runId = randomUUID();

  let plan: DemoResetPlan;
  try {
    plan = await planDemoReset(database);
  } catch (error) {
    // Recorded, then rethrown. Without this a failed plan left no trace at all
    // while a failed real run recorded `failure` — an asymmetry that made "was
    // a dry run all anyone did last night?" unanswerable in exactly the case
    // where the answer is interesting.
    await recordDemoResetRun({
      runId,
      trigger: options.trigger,
      outcome: 'failure',
      startedAt,
      finishedAt: new Date(),
      database,
      counts: {},
      validationFailures: [],
      error,
    });
    throw error;
  }

  // The one record a dry run writes. Worth the exception: without it a plan
  // leaves no trace, and "was a dry run all anyone did last night?" is a
  // question the history exists to answer. The counts are flattened because
  // the row holds numbers, not nested objects.
  await recordDemoResetRun({
    runId,
    trigger: options.trigger,
    outcome: 'dry-run',
    startedAt,
    finishedAt: new Date(),
    database,
    counts: { ...plan.wouldDelete, ...plan.wouldRestore },
    validationFailures: [],
    error: null,
  });

  return plan;
}

// Thrown when another reset holds the advisory lock. A distinct type rather
// than a plain Error because callers have to tell it apart from a genuine
// failure — the admin route answers 409 for it and 500 for everything else,
// and matching on the message text meant a reworded string silently turned
// the 409 back into a 500 with nobody the wiser.
export class DemoResetInProgressError extends Error {
  constructor() {
    super('A demo reset is already running');
    this.name = 'DemoResetInProgressError';
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function runDemoReset(): Promise<DemoResetWorkCounts> {
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
  const demo = await User.findOne(DEMO_CUSTOMER_FILTER).select('_id');

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
