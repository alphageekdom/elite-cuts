import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// reset.ts pulls in `server-only`, `connectDB`, and a dozen Mongoose
// models. None of that runs cleanly outside Next's bundler / a live DB,
// so each gets stubbed. The tests exercise:
//   1. resetDemoCustomerState — demo customer not found / found branches.
//   2. The review gap: reviews the demo customer *authored* are deleted and
//      the affected products' ratings recomputed.
//   3. resetDemoData — orchestrator merges the customer wipe with the
//      catalog restore.
// The restore half has its own suite in ./restore.test.ts. End-to-end wipe
// behavior (what a real `deleteMany` actually clears in Mongo) is out of
// scope until the project gains mongodb-memory-server.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userUpdateOne: vi.fn(),
  orderDeleteMany: vi.fn(),
  cartDeleteMany: vi.fn(),
  savedCardDeleteMany: vi.fn(),
  notificationDeleteMany: vi.fn(),
  messageDeleteMany: vi.fn(),
  reviewUpdateMany: vi.fn(),
  reviewFind: vi.fn(),
  reviewDeleteMany: vi.fn(),
  recomputeProductRating: vi.fn(),
  lockFindOneAndUpdate: vi.fn(),
  lockUpdateOne: vi.fn(),
  userUpdateMany: vi.fn(),
  assertDemoResetTarget: vi.fn(),
  verifyDemoState: vi.fn(),
  recordDemoResetRun: vi.fn(),
  planDemoReset: vi.fn(),
  deleteStripeCustomer: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    findOne: mocks.userFindOne,
    updateOne: mocks.userUpdateOne,
    updateMany: mocks.userUpdateMany,
  },
}));

vi.mock('@/models/Order', () => ({
  default: { deleteMany: mocks.orderDeleteMany },
}));

vi.mock('@/models/Cart', () => ({
  default: { deleteMany: mocks.cartDeleteMany },
}));

vi.mock('@/models/SavedCard', () => ({
  default: { deleteMany: mocks.savedCardDeleteMany },
}));

vi.mock('@/models/Notification', () => ({
  default: { deleteMany: mocks.notificationDeleteMany },
}));

vi.mock('@/models/Message', () => ({
  default: { deleteMany: mocks.messageDeleteMany },
}));

vi.mock('@/models/Review', () => ({
  default: {
    updateMany: mocks.reviewUpdateMany,
    find: mocks.reviewFind,
    deleteMany: mocks.reviewDeleteMany,
  },
}));

vi.mock('@/lib/reviews/recompute', () => ({
  recomputeProductRating: mocks.recomputeProductRating,
}));

vi.mock('@/models/DemoResetLock', () => ({
  default: {
    findOneAndUpdate: mocks.lockFindOneAndUpdate,
    updateOne: mocks.lockUpdateOne,
  },
  DEMO_RESET_LOCK_ID: 'demo-reset',
  DEMO_RESET_LOCK_STALE_AFTER_MS: 10 * 60 * 1000,
}));

// The target-database guard has its own suite in ./target-guard.test.ts. Here
// it is stubbed to pass, so these tests exercise the orchestration rather than
// re-testing the guard — except in the one case below that asserts a refusal
// stops the run, which overrides this.
vi.mock('./target-guard', async () => {
  const actual = await vi.importActual<typeof import('./target-guard')>(
    './target-guard',
  );
  return {
    ...actual,
    assertDemoResetTarget: mocks.assertDemoResetTarget,
  };
});

vi.mock('./verify', () => ({
  verifyDemoState: mocks.verifyDemoState,
}));

vi.mock('./run-history', () => ({
  recordDemoResetRun: mocks.recordDemoResetRun,
}));

vi.mock('./dry-run', () => ({
  planDemoReset: mocks.planDemoReset,
}));

vi.mock('@/lib/payments/savedCards', () => ({
  deleteStripeCustomer: mocks.deleteStripeCustomer,
}));

// The catalog half is exercised in ./restore.test.ts; here it only needs to
// resolve so the orchestrator can be tested. `emptyCatalogCounts` is stubbed
// rather than imported for real because pulling in the module would drag
// `server-only` and eight Mongoose models along with it.
vi.mock('./restore', () => ({
  emptyCatalogCounts: () => ({
    productsRestored: 0,
    productsDeleted: 0,
    promosRestored: 0,
    promosDeleted: 0,
    staffRestored: 0,
    shiftsRestored: 0,
    eventsDeleted: 0,
    settingsRestored: false,
  }),
  restoreDemoCatalog: vi.fn(async () => ({
    productsRestored: 39,
    productsDeleted: 0,
    promosRestored: 5,
    promosDeleted: 0,
    staffRestored: 6,
    shiftsRestored: 49,
    eventsDeleted: 0,
    settingsRestored: true,
  })),
}));

// The customer seed has its own suite in ./seed-customer.test.ts. Mocked here for
// the same reason as the restore: importing it for real drags `server-only`
// and the Product/Order models in.
vi.mock('./seed-customer', () => ({
  emptyCustomerSeedCounts: () => ({
    ordersSeeded: 0,
    pointsEntriesSeeded: 0,
    savedCutsSeeded: 0,
    savedCardsSeeded: 0,
    addressesSeeded: 0,
  }),
  seedDemoCustomerData: vi.fn(async () => ({
    counts: {
      ordersSeeded: 6,
      pointsEntriesSeeded: 5,
      savedCutsSeeded: 3,
      savedCardsSeeded: 2,
      addressesSeeded: 2,
    },
    // Two rows with deltas that sum to something other than the fallback, so
    // a balance assertion can tell "summed the ledger" from "kept the
    // constant". 89 + 27 = 116.
    pointsHistory: [
      { delta: 89, reason: 'order_fulfilled', orderId: 'order-1', expiresAt: null, createdAt: new Date(0) },
      { delta: 27, reason: 'order_fulfilled', orderId: 'order-2', expiresAt: null, createdAt: new Date(0) },
    ],
    savedCuts: ['cut-1', 'cut-2', 'cut-3'],
    addresses: [{ label: 'Home' }, { label: 'Work' }],
  })),
}));

// Match the chained `.select('_id')` on the findOne result — return a
// thenable so `await` resolves to the user (or null).
const findOneChain = (result: unknown) => ({
  select: () => Promise.resolve(result),
});

// `resetDemoCustomerState` looks up the demo customer, then the demo admin
// (whose notifications are cleared too — the new-order fanout reaches every
// admin). Queue both lookups in call order.
const mockCustomerThenAdmin = (customer: unknown, admin: unknown = null) => {
  mocks.userFindOne
    .mockReturnValueOnce(findOneChain(customer))
    .mockReturnValueOnce(findOneChain(admin));
};

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  // The real helper returns a Promise and the reset attaches a per-item
  // `.catch` to it; a bare `vi.fn()` resolving `undefined` would diverge from
  // that contract and blow up on the attach.
  mocks.recomputeProductRating.mockResolvedValue(undefined);

  // Defaults for the collaborators the orchestrator gained. Each returns the
  // healthy shape so a test only has to override the one thing it is about.
  // `verifyDemoState` in particular is destructured, so a bare reset (which
  // resolves `undefined`) would throw before the assertion ran.
  mocks.assertDemoResetTarget.mockReturnValue('elite-cuts-test');
  mocks.verifyDemoState.mockResolvedValue([]);
  mocks.recordDemoResetRun.mockResolvedValue(undefined);
  mocks.deleteStripeCustomer.mockResolvedValue(undefined);
  mocks.userUpdateMany.mockResolvedValue({ modifiedCount: 0 });
});

describe('resetDemoCustomerState — demo customer not found', () => {
  it('returns the zero-counts shape and does not touch downstream collections', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain(null));

    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(counts).toEqual({
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

    // Critical guarantee: when the demo customer isn't found, NONE of the
    // owned-collection deletes should fire — otherwise a tampered or
    // empty-DB call could wipe across non-demo data.
    expect(mocks.orderDeleteMany).not.toHaveBeenCalled();
    expect(mocks.cartDeleteMany).not.toHaveBeenCalled();
    expect(mocks.savedCardDeleteMany).not.toHaveBeenCalled();
    expect(mocks.notificationDeleteMany).not.toHaveBeenCalled();
    expect(mocks.messageDeleteMany).not.toHaveBeenCalled();
    expect(mocks.reviewUpdateMany).not.toHaveBeenCalled();
    expect(mocks.reviewDeleteMany).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
  });
});

describe('resetDemoCustomerState — demo customer found', () => {
  const demoId = 'demo-customer-id';
  const demoAdminId = 'demo-admin-id';

  beforeEach(() => {
    mockCustomerThenAdmin({ _id: demoId }, { _id: demoAdminId });
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.messageDeleteMany.mockResolvedValue({ deletedCount: 4 });
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.reviewFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    });
    mocks.reviewDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('scopes every delete by BOTH demo account ids', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    // The storefront is open to any signed-in session and the no-charge
    // checkout tile enables itself for any demo account, so a visitor
    // exploring the ADMIN demo can shop too. Scoping these to the customer
    // alone left those rows behind permanently.
    const bothOwners = { user: { $in: [demoId, demoAdminId] } };
    expect(mocks.orderDeleteMany).toHaveBeenCalledWith(bothOwners);
    expect(mocks.cartDeleteMany).toHaveBeenCalledWith(bothOwners);
    expect(mocks.savedCardDeleteMany).toHaveBeenCalledWith(bothOwners);
    // Messages sent to the shop sit outside every other owner-scoped delete,
    // and used to survive the reset entirely — visible to the next demo
    // visitor and to every admin, permanently.
    expect(mocks.messageDeleteMany).toHaveBeenCalledWith(bothOwners);
    // Notification uses `userId`, not `user` — Phase B's exploration
    // flagged the schema inconsistency. The new-order fanout notifies every
    // admin, so the demo admin's bell would otherwise grow without bound and
    // point at deleted orders.
    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: { $in: [demoId, demoAdminId] },
    });
  });

  it('scopes to the customer alone when no demo admin exists', async () => {
    mocks.userFindOne.mockReset();
    mockCustomerThenAdmin({ _id: demoId }, null);

    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: { $in: [demoId] },
    });
    expect(mocks.orderDeleteMany).toHaveBeenCalledWith({
      user: { $in: [demoId] },
    });
  });

  it('clears the demo admin storefront leftovers without touching its rewards', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    const adminCall = mocks.userUpdateOne.mock.calls.find(
      ([filter]) => (filter as { _id: string })._id === demoAdminId,
    );
    expect(adminCall).toBeDefined();
    // Shopping fields only — the admin account demonstrates the dashboard,
    // not the loyalty programme, so it gets no points seed.
    expect(adminCall![1].$set).toEqual({ savedCuts: [], addresses: [] });
  });

  it('pulls both demo ids out of every review helpful-voter list', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    // Helpful votes live on shared Review docs, not the demo accounts' own
    // collections, so they must be scrubbed separately or they'd persist
    // across the reset and reshuffle the "Most helpful" badge.
    expect(mocks.reviewUpdateMany).toHaveBeenCalledWith(
      { helpfulVoters: { $in: [demoId, demoAdminId] } },
      { $pull: { helpfulVoters: { $in: [demoId, demoAdminId] } } },
    );
  });

  it('clears the User-embedded state', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    const customerCall = mocks.userUpdateOne.mock.calls.find(
      ([f]) => (f as { _id: string })._id === demoId,
    );
    expect(customerCall).toBeDefined();
    const [filter, update] = customerCall!;
    expect(filter).toEqual({ _id: demoId });
    expect(update.$set).toMatchObject({
      savedCuts: [],
      addresses: [],
      currentTier: null,
      dormancyWarnedAt: null,
      lastActiveAt: null,
    });
  });

  it('seeds a redeemable points balance rather than zeroing it', async () => {
    const { resetDemoCustomerState, DEMO_FALLBACK_POINTS } = await import(
      './reset'
    );
    await resetDemoCustomerState();

    const [, update] = mocks.userUpdateOne.mock.calls.find(
      ([f]) => (f as { _id: string })._id === demoId,
    )!;
    expect(update.$set.rewardPoints).toBe(DEMO_FALLBACK_POINTS);
    expect(update.$set.lifetimePoints).toBe(DEMO_FALLBACK_POINTS);

    // Points are only awarded when an admin fulfils an order, and order
    // writes are closed to demo admins — so a demo customer starting at zero
    // could never earn one. Without this the rewards half of the shop is
    // undemonstrable. `resetDemoData` overwrites all three with values derived
    // from the seeded orders; this is the standalone-call fallback.
    const [entry] = update.$set.pointsHistory;
    expect(entry.delta).toBe(DEMO_FALLBACK_POINTS);
    // Only `order_fulfilled` counts toward tier qualification; an
    // `admin_adjustment` would leave the tier bar stuck at zero.
    expect(entry.reason).toBe('order_fulfilled');
    // The window has to open now, or the seeded entry falls outside it.
    expect(update.$set.tierAnniversaryAt).toBeInstanceOf(Date);
  });

  it('returns the per-collection counts from each deleteMany result', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(counts).toEqual({
      ordersDeleted: 3,
      cartDeleted: 1,
      savedCardsDeleted: 2,
      notificationsDeleted: 5,
      reviewsDeleted: 0,
      messagesDeleted: 4,
      userReset: true,
      ratingRecomputeFailures: 0,
      stripeCustomersCleared: 0,
    });
  });

  it('tolerates a missing deletedCount and reports zero for that collection', async () => {
    mocks.orderDeleteMany.mockResolvedValue({}); // no deletedCount returned
    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(counts.ordersDeleted).toBe(0);
    expect(counts.userReset).toBe(true);
  });
});

// ── Stripe Customers attached to the shared demo accounts ──────────────
// The SavedCard delete only clears the LOCAL mirror. Cards saved through
// Stripe's hosted page attach to a Stripe Customer, and two accounts are shared
// by every visitor for the life of the deploy — so that PaymentMethod list grew
// without bound while the profile tab, reading the wiped mirror, showed nothing.
describe('resetDemoCustomerState — Stripe cleanup', () => {
  beforeEach(() => {
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.messageDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.reviewFind.mockReturnValue({ select: () => ({ lean: async () => [] }) });
    mocks.reviewDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('deletes the Stripe Customer for both demo accounts and clears the local id', async () => {
    mockCustomerThenAdmin(
      { _id: 'demo-customer', stripeCustomerId: 'cus_customer' },
      { _id: 'demo-admin', stripeCustomerId: 'cus_admin' },
    );

    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(mocks.deleteStripeCustomer).toHaveBeenCalledWith('cus_customer');
    expect(mocks.deleteStripeCustomer).toHaveBeenCalledWith('cus_admin');
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ['demo-customer', 'demo-admin'] } },
      { $unset: { stripeCustomerId: '' } },
    );
    expect(counts.stripeCustomersCleared).toBe(2);
  });

  it('deletes at Stripe before clearing the local id', async () => {
    mockCustomerThenAdmin({ _id: 'demo-customer', stripeCustomerId: 'cus_customer' });

    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    // Reversed, a failure between the two drops the only pointer to a live
    // Customer — which is precisely the leak being closed. This way the same
    // failure leaves the id in place and the next night retries it.
    expect(mocks.deleteStripeCustomer.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.userUpdateMany.mock.invocationCallOrder[0],
    );
  });

  it('does nothing when neither account has a Stripe Customer', async () => {
    // The expected steady state once `getOrCreateStripeCustomer` stops minting
    // one for demo accounts: this becomes a permanent no-op rather than an
    // ongoing sweep.
    mockCustomerThenAdmin({ _id: 'demo-customer' }, { _id: 'demo-admin' });

    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(mocks.deleteStripeCustomer).not.toHaveBeenCalled();
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    expect(counts.stripeCustomersCleared).toBe(0);
  });

  it('clears only the account that actually has one', async () => {
    mockCustomerThenAdmin({ _id: 'demo-customer' }, { _id: 'demo-admin', stripeCustomerId: 'cus_admin' });

    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(mocks.deleteStripeCustomer).toHaveBeenCalledTimes(1);
    expect(mocks.deleteStripeCustomer).toHaveBeenCalledWith('cus_admin');
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ['demo-admin'] } },
      { $unset: { stripeCustomerId: '' } },
    );
    expect(counts.stripeCustomersCleared).toBe(1);
  });
});

// ── The review gap ─────────────────────────────────────────────────────
// Reviews the demo customer authored are public and were previously the one
// thing a demo session left behind permanently: the wipe pulled the demo id
// out of every `helpfulVoters` list but never removed the rows themselves.

describe('resetDemoCustomerState — authored reviews', () => {
  const demoId = 'demo-customer-id';

  beforeEach(() => {
    mockCustomerThenAdmin({ _id: demoId }, null);
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.messageDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.reviewFind.mockReturnValue({
      select: () => ({
        lean: async () => [
          { product: 'ribeye-id' },
          { product: 'brisket-id' },
          // Same product twice — two reviews can't share a user, but a
          // duplicate here would mean a wasted second recompute.
          { product: 'ribeye-id' },
        ],
      }),
    });
    mocks.reviewDeleteMany.mockResolvedValue({ deletedCount: 3 });
  });

  it('deletes the rows and reports the count', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(mocks.reviewDeleteMany).toHaveBeenCalledWith({
      user: { $in: [demoId] },
    });
    expect(counts.reviewsDeleted).toBe(3);
  });

  it('recomputes each affected product rating exactly once', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    // Ratings are an average over surviving reviews, so removing rows without
    // recomputing would leave every affected cut showing a stale score.
    expect(mocks.recomputeProductRating).toHaveBeenCalledTimes(2);
    const recomputed = mocks.recomputeProductRating.mock.calls.map((c) => c[0]);
    expect(recomputed.sort()).toEqual(['brisket-id', 'ribeye-id']);
  });

  // The worklist is derived from rows the delete destroys, so it cannot be
  // rebuilt on a later run: a throw between the delete and a deferred
  // recompute stranded the wrong ratings PERMANENTLY (the next run finds no
  // authored reviews, and the catalog restore deliberately never writes
  // `rating`). Recomputing immediately shrinks that window to nothing.
  it('recomputes immediately after the delete, not at the end of the wipe', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.recomputeProductRating.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.reviewDeleteMany.mock.invocationCallOrder[0],
    );
    // Before the owned-collection wipe — anything after it is a chance to
    // throw in between.
    expect(mocks.recomputeProductRating.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.orderDeleteMany.mock.invocationCallOrder[0],
    );
  });

  it('lets one failed recompute stale a single rating instead of aborting the reset', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.recomputeProductRating
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);

    const { resetDemoCustomerState } = await import('./reset');
    await expect(resetDemoCustomerState()).resolves.toMatchObject({ userReset: true });

    // The ~100 round-trips of catalog restore behind this must not be gated
    // on a two-round-trip cleanup step.
    expect(mocks.orderDeleteMany).toHaveBeenCalled();
  });

  // Swallowing the failure is right; swallowing it SILENTLY was not. The cron
  // wrapper answers 500 off this count, so a run where recomputes failed stops
  // being indistinguishable from a clean one. Without it the nightly reset
  // reported 200 with a tidy-looking count and the stale ratings sat there.
  it('reports no rating failures on a clean run', async () => {
    const { resetDemoCustomerState } = await import('./reset');

    await expect(resetDemoCustomerState()).resolves.toMatchObject({
      ratingRecomputeFailures: 0,
    });
  });

  it('counts a swallowed recompute failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.recomputeProductRating
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);

    const { resetDemoCustomerState } = await import('./reset');

    await expect(resetDemoCustomerState()).resolves.toMatchObject({
      ratingRecomputeFailures: 1,
    });
  });

  it('counts every failure when the whole recompute step fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.recomputeProductRating.mockRejectedValue(new Error('mongo down'));

    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    // Two distinct products from the three mocked reviews.
    expect(counts.ratingRecomputeFailures).toBe(2);
    // Still a completed wipe — the count is the signal, not an abort.
    expect(counts.userReset).toBe(true);
  });
});

// ── Top-level orchestrator ─────────────────────────────────────────────
// `resetDemoData` is the customer wipe followed by the catalog restore. The
// restore is mocked here (it has its own suite) — what matters is that both
// halves run and their counts merge into one envelope.

describe('resetDemoData', () => {
  const demoId = 'demo-customer-id';

  const demoAdminId = 'demo-admin-id';

  // The last write aimed at the demo CUSTOMER. Found by filter rather than by
  // index because the wipe also writes the demo admin's storefront fields.
  const lastCustomerWrite = () => {
    const calls = mocks.userUpdateOne.mock.calls.filter(
      ([f]) => (f as { _id: string })._id === demoId,
    );
    return calls[calls.length - 1][1];
  };

  beforeEach(() => {
    // Keyed off the filter rather than call order: the wipe looks up the
    // customer AND the admin, and the orchestrator looks the customer up
    // again after the catalog restore. Returning distinct docs keeps the two
    // demo accounts distinguishable, which is what the wipe scopes by.
    mocks.userFindOne.mockImplementation((filter?: { demoType?: string }) =>
      findOneChain(
        filter?.demoType === 'admin' ? { _id: demoAdminId } : { _id: demoId },
      ),
    );
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.messageDeleteMany.mockResolvedValue({ deletedCount: 4 });
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.reviewFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    });
    mocks.reviewDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.lockFindOneAndUpdate.mockResolvedValue({ _id: 'demo-reset' });
    mocks.lockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('verifies the target database before claiming the lock', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    // Strictly before the lock claim, not merely before the deletes. The claim
    // is itself a write — an upsert into DemoResetLock — so a guard that ran
    // after it would already have touched the database it is deciding whether
    // to touch.
    expect(mocks.assertDemoResetTarget.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.lockFindOneAndUpdate.mock.invocationCallOrder[0],
    );
  });

  it('does nothing at all when the target guard refuses', async () => {
    const { DemoResetTargetError } = await import('./target-guard');
    mocks.assertDemoResetTarget.mockImplementation(() => {
      throw new DemoResetTargetError('wrong-database');
    });

    const { resetDemoData } = await import('./reset');
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toBeInstanceOf(
      DemoResetTargetError,
    );

    // Not one write, including the lock and including the run history — a
    // refusal means this is not the declared database, and recording a row in
    // it would be the reset touching what it just refused to touch.
    expect(mocks.lockFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.orderDeleteMany).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
    expect(mocks.recordDemoResetRun).not.toHaveBeenCalled();
  });

  it('runs the guard on a dry run too, and writes nothing when it refuses', async () => {
    const { DemoResetTargetError } = await import('./target-guard');
    mocks.assertDemoResetTarget.mockImplementation(() => {
      throw new DemoResetTargetError('not-configured');
    });

    const { dryRunDemoReset } = await import('./reset');
    await expect(dryRunDemoReset({ trigger: 'cli' })).rejects.toBeInstanceOf(
      DemoResetTargetError,
    );
    expect(mocks.planDemoReset).not.toHaveBeenCalled();
    expect(mocks.recordDemoResetRun).not.toHaveBeenCalled();
  });

  it('records a failure row when planning throws, then rethrows', async () => {
    // Without this the two paths were asymmetric: a failed real run recorded
    // `failure`, a failed plan recorded nothing at all — in exactly the case
    // where "was a dry run all anyone did last night?" is interesting.
    const original = new Error('target unreachable');
    mocks.planDemoReset.mockRejectedValue(original);

    const { dryRunDemoReset } = await import('./reset');
    await expect(dryRunDemoReset({ trigger: 'cli' })).rejects.toBe(original);

    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', error: original }),
    );
  });

  it('takes no lock and makes no wipe writes on a dry run', async () => {
    mocks.planDemoReset.mockResolvedValue({
      database: 'elite-cuts-test',
      wouldDelete: { orders: 3 },
      wouldRestore: { staff: 6 },
      cannotPredict: ['something'],
    });

    const { dryRunDemoReset } = await import('./reset');
    const plan = await dryRunDemoReset({ trigger: 'cli' });

    expect(plan.wouldDelete).toEqual({ orders: 3 });
    // The lock is a write, and a dry run that took it would block the nightly
    // cron for its duration.
    expect(mocks.lockFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.orderDeleteMany).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
    // The single deliberate exception: its own history row.
    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'dry-run', trigger: 'cli' }),
    );
  });

  it('claims the advisory lock before touching anything, and releases it after', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    // Claim strictly precedes the first destructive call — the lock exists
    // because two overlapping runs interleave the wipe/seed pairs into
    // doubled orders or an empty roster.
    expect(mocks.lockFindOneAndUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.orderDeleteMany.mock.invocationCallOrder[0],
    );
    expect(mocks.lockUpdateOne).toHaveBeenCalledWith(
      { _id: 'demo-reset' },
      { $set: { heldSince: null } },
    );
  });

  it('refuses to run when another reset holds the lock', async () => {
    // The claim's upsert colliding with the held lock's _id IS the signal.
    mocks.lockFindOneAndUpdate.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    const { resetDemoData, DemoResetInProgressError } = await import('./reset');
    // A distinct type, not a message: the admin route answers 409 for this
    // and 500 for everything else, and it used to tell them apart with a
    // regex over the message text.
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toBeInstanceOf(DemoResetInProgressError);

    // The loser must do NO work — a half-run is the exact corruption the
    // lock exists to prevent.
    expect(mocks.orderDeleteMany).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
  });

  it('releases the lock even when the reset itself throws', async () => {
    mocks.orderDeleteMany.mockRejectedValue(new Error('mongo hiccup'));

    const { resetDemoData } = await import('./reset');
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toThrow('mongo hiccup');

    expect(mocks.lockUpdateOne).toHaveBeenCalledWith(
      { _id: 'demo-reset' },
      { $set: { heldSince: null } },
    );
  });

  it('does not mistake an ordinary claim failure for a held lock', async () => {
    // Only a duplicate-key collision means "already running". Anything else
    // (connection refused, timeout) must surface as itself, not as the
    // misleading "already running" message.
    mocks.lockFindOneAndUpdate.mockRejectedValue(new Error('connection refused'));

    const { resetDemoData } = await import('./reset');
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toThrow('connection refused');
  });

  it('merges the customer wipe and the catalog restore into one envelope', async () => {
    const { resetDemoData } = await import('./reset');
    const counts = await resetDemoData({ trigger: 'cron' });

    // `toEqual`, not `toMatchObject`, so a key silently disappearing from
    // either half fails here rather than passing.
    expect(counts).toEqual({
      ordersDeleted: 3,
      cartDeleted: 1,
      savedCardsDeleted: 2,
      notificationsDeleted: 5,
      reviewsDeleted: 0,
      messagesDeleted: 4,
      userReset: true,
      ratingRecomputeFailures: 0,
      stripeCustomersCleared: 0,
      productsRestored: 39,
      productsDeleted: 0,
      promosRestored: 5,
      promosDeleted: 0,
      staffRestored: 6,
      shiftsRestored: 49,
      eventsDeleted: 0,
      settingsRestored: true,
      ordersSeeded: 6,
      pointsEntriesSeeded: 5,
      savedCutsSeeded: 3,
      savedCardsSeeded: 2,
      addressesSeeded: 2,
      validationFailures: [],
    });
  });

  it('zero-state carries exactly the keys a real run returns', async () => {
    // `emptyDemoResetCounts` is what the cron route returns on lock contention,
    // and the route's `failureCount` reads `validationFailures.length` off it.
    // Lose that key and every contended night throws a TypeError inside the
    // selector, the wrapper's catch fires, and the route answers 500 on exactly
    // the nights it should answer a clean 200 with the index report.
    //
    // The route's own test cannot catch that — it MOCKS `emptyDemoResetCounts`,
    // so the mock supplies the completeness the test claims to prove. Pinned
    // here against the real function and a real result, structurally, so it
    // does not restate today's field list.
    const { resetDemoData, emptyDemoResetCounts } = await import('./reset');
    const real = await resetDemoData({ trigger: 'cron' });

    expect(Object.keys(emptyDemoResetCounts()).sort()).toEqual(
      Object.keys(real).sort(),
    );
  });

  it('surfaces post-run verification failures on the returned counts', async () => {
    // The whole point of G3: "every step ran" and "the demo works" are
    // different claims. These identifiers feed the cron wrapper's
    // `failureCount`, which is what turns a broken demo into a 500.
    mocks.verifyDemoState.mockResolvedValue([
      'product:dry-aged-ribeye',
      'staff:Tomás Reyes',
    ]);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { resetDemoData } = await import('./reset');
    const counts = await resetDemoData({ trigger: 'cron' });

    expect(counts.validationFailures).toEqual([
      'product:dry-aged-ribeye',
      'staff:Tomás Reyes',
    ]);
    // Named in the log, not just counted — the identifier is what sends
    // someone to the row instead of to the whole collection.
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('product:dry-aged-ribeye'),
    );
    logged.mockRestore();
  });

  it('verifies after the work, not instead of it', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    // A partially restored demo still beats none, and the operator needs to
    // know which identifiers are missing — so the run completes first.
    expect(mocks.verifyDemoState.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.orderDeleteMany.mock.invocationCallOrder[0],
    );
  });

  it('records a failure row when verification finds a gap, despite every write succeeding', async () => {
    mocks.verifyDemoState.mockResolvedValue(['promo:WELCOME10']);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'failure',
        validationFailures: ['promo:WELCOME10'],
        database: 'elite-cuts-test',
      }),
    );
  });

  it('records a success row on a clean run, labelled with its trigger', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cli' });

    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', trigger: 'cli', error: null }),
    );
  });

  it('records a failure row when the run throws, then rethrows the ORIGINAL error', async () => {
    // `toBe`, not `toThrow`: the failure path records a row and then rethrows,
    // and the run's actual cause must survive that — a row written after the
    // rethrow, or an error re-wrapped on the way out, would replace the one
    // thing a failure row exists to preserve.
    //
    // `recordDemoResetRun` swallowing its own write errors is what makes this
    // hold; that contract is asserted where it lives, in `run-history.test.ts`,
    // rather than restated here against a mock that could be made to violate it
    // and prove nothing.
    const original = new Error('mongo hiccup');
    mocks.orderDeleteMany.mockRejectedValue(original);

    const { resetDemoData } = await import('./reset');
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toBe(original);

    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    );
  });

  it('records a skipped row when another run holds the lock', async () => {
    // Distinguishable afterwards from a night the cron never fired at all,
    // which is otherwise the same absence of evidence.
    mocks.lockFindOneAndUpdate.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    const { resetDemoData } = await import('./reset');
    await expect(resetDemoData({ trigger: 'cron' })).rejects.toThrow();

    expect(mocks.recordDemoResetRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'skipped' }),
    );
  });


  it('produces the same end state when run twice in a row (idempotency)', async () => {
    const { resetDemoData } = await import('./reset');
    const first = await resetDemoData({ trigger: 'cron' });
    const second = await resetDemoData({ trigger: 'cron' });
    expect(second).toEqual(first);
  });

  it('skips the catalog restore when there is no demo customer', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain(null));

    const { resetDemoData } = await import('./reset');
    const restore = await import('./restore');
    const seed = await import('./seed-customer');
    // Created inside the `vi.mock` factory, so the shared beforeEach — which
    // only walks `mocks` — never resets it and calls accumulate across tests.
    vi.mocked(restore.restoreDemoCatalog).mockClear();
    vi.mocked(seed.seedDemoCustomerData).mockClear();

    const counts = await resetDemoData({ trigger: 'cron' });

    // No demo customer means the demo seed never ran here, so restoring would
    // overwrite this install's real products, staff, shifts and settings with
    // a snapshot meant for a demo that doesn't exist.
    expect(restore.restoreDemoCatalog).not.toHaveBeenCalled();
    // Same guarantee for the order seed, and a sharper one: there is no demo
    // customer to own these orders, so seeding would write history against
    // nobody — or worse, against whatever id a later bug supplied.
    expect(seed.seedDemoCustomerData).not.toHaveBeenCalled();
    expect(counts.userReset).toBe(false);
    expect(counts.productsRestored).toBe(0);
    expect(counts.settingsRestored).toBe(false);
    expect(counts.ordersSeeded).toBe(0);
    expect(counts.pointsEntriesSeeded).toBe(0);
  });

  it('seeds order history only after the catalog restore has settled product ids', async () => {
    const { resetDemoData } = await import('./reset');
    const restore = await import('./restore');
    const seed = await import('./seed-customer');
    vi.mocked(restore.restoreDemoCatalog).mockClear();
    vi.mocked(seed.seedDemoCustomerData).mockClear();

    await resetDemoData({ trigger: 'cron' });

    // Order lines hold product ids. The restore upserts on a natural key, so
    // running the seed first would race the step that settles those ids.
    const restoreOrder =
      vi.mocked(restore.restoreDemoCatalog).mock.invocationCallOrder[0];
    const seedOrder = vi.mocked(seed.seedDemoCustomerData).mock.invocationCallOrder[0];
    expect(restoreOrder).toBeLessThan(seedOrder);
  });

  it('replaces the fallback ledger entry with one row per seeded order', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    // The wipe writes a fallback entry, then the orchestrator overwrites it
    // with the real history. The fallback exists so `resetDemoCustomerState`
    // alone leaves a coherent account; this second write is what makes the
    // rewards rows add up to the headline balance.
    const ledgerWrite = lastCustomerWrite();
    expect(ledgerWrite.$set.pointsHistory).toHaveLength(2);
    expect(ledgerWrite.$set.pointsHistory[0].orderId).toBe('order-1');
  });

  it('banks the sum of the seeded awards, not the fallback constant', async () => {
    const { resetDemoData, DEMO_FALLBACK_POINTS } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    const secondWrite = [null, lastCustomerWrite()] as const;
    // 89 + 27 from the seed mock. The balance used to be a fixed number the
    // per-order awards were reverse-engineered to match, which put rows like
    // "+212" against a $159.99 order under a heading reading the shop's real
    // one-point-per-dollar rate. Summing the ledger is what closes that.
    expect(secondWrite[1].$set.rewardPoints).toBe(116);
    // Nothing has been redeemed on a fresh account, so lifetime tracks it.
    expect(secondWrite[1].$set.lifetimePoints).toBe(116);
    expect(secondWrite[1].$set.rewardPoints).not.toBe(DEMO_FALLBACK_POINTS);
  });

  it('leaves the fallback balance alone when the seed produced no orders', async () => {
    const seed = await import('./seed-customer');
    vi.mocked(seed.seedDemoCustomerData).mockResolvedValueOnce({
      counts: {
        ordersSeeded: 0,
        pointsEntriesSeeded: 0,
        savedCutsSeeded: 3,
        savedCardsSeeded: 2,
        addressesSeeded: 2,
      },
      pointsHistory: [],
      savedCuts: [],
      addresses: [],
    } as unknown as Awaited<ReturnType<typeof seed.seedDemoCustomerData>>);

    const { resetDemoData } = await import('./reset');
    await resetDemoData({ trigger: 'cron' });

    // An empty catalog seeds no orders. Writing a zero balance over the
    // fallback would leave the rewards tab with nothing to demonstrate, so
    // the second write must not touch the points fields at all.
    const finalWrite = lastCustomerWrite();
    expect(finalWrite.$set).not.toHaveProperty('rewardPoints');
    expect(finalWrite.$set).not.toHaveProperty('lifetimePoints');
    expect(finalWrite.$set).not.toHaveProperty('pointsHistory');
  });
});
