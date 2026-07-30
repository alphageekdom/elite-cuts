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
}));

vi.mock('@/models/User', () => ({
  default: {
    findOne: mocks.userFindOne,
    updateOne: mocks.userUpdateOne,
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

  it('scopes every delete by the demo customer id', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.orderDeleteMany).toHaveBeenCalledWith({ user: demoId });
    expect(mocks.cartDeleteMany).toHaveBeenCalledWith({ user: demoId });
    expect(mocks.savedCardDeleteMany).toHaveBeenCalledWith({ user: demoId });
    // Messages the demo customer sent the shop sit outside every other
    // owner-scoped delete, and used to survive the reset entirely — visible
    // to the next demo visitor and to every admin, permanently.
    expect(mocks.messageDeleteMany).toHaveBeenCalledWith({ user: demoId });
    // Notification uses `userId`, not `user` — Phase B's exploration
    // flagged the schema inconsistency. Both demo accounts are cleared: the
    // new-order fanout notifies every admin, so the demo admin's bell would
    // otherwise grow without bound and point at deleted orders.
    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: { $in: [demoId, demoAdminId] },
    });
  });

  it('clears only the demo customer notifications when no demo admin exists', async () => {
    mocks.userFindOne.mockReset();
    mockCustomerThenAdmin({ _id: demoId }, null);

    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: { $in: [demoId] },
    });
  });

  it('pulls the demo id out of every review helpful-voter list', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    // Helpful votes live on shared Review docs, not the demo customer's own
    // collections, so they must be scrubbed separately or they'd persist
    // across the reset and reshuffle the "Most helpful" badge.
    expect(mocks.reviewUpdateMany).toHaveBeenCalledWith(
      { helpfulVoters: demoId },
      { $pull: { helpfulVoters: demoId } },
    );
  });

  it('clears the User-embedded state', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.userUpdateOne).toHaveBeenCalledOnce();
    const [filter, update] = mocks.userUpdateOne.mock.calls[0];
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

    const [, update] = mocks.userUpdateOne.mock.calls[0];
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

    expect(mocks.reviewDeleteMany).toHaveBeenCalledWith({ user: demoId });
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
});

// ── Top-level orchestrator ─────────────────────────────────────────────
// `resetDemoData` is the customer wipe followed by the catalog restore. The
// restore is mocked here (it has its own suite) — what matters is that both
// halves run and their counts merge into one envelope.

describe('resetDemoData', () => {
  const demoId = 'demo-customer-id';

  beforeEach(() => {
    // `mockReturnValue` (not `...Once`) because the orchestrator looks up the
    // demo customer again after the catalog restore, on top of the two
    // lookups the customer wipe already does.
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));
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

  it('merges the customer wipe and the catalog restore into one envelope', async () => {
    const { resetDemoData } = await import('./reset');
    const counts = await resetDemoData();

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
    });
  });

  it('produces the same end state when run twice in a row (idempotency)', async () => {
    const { resetDemoData } = await import('./reset');
    const first = await resetDemoData();
    const second = await resetDemoData();
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

    const counts = await resetDemoData();

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

    await resetDemoData();

    // Order lines hold product ids. The restore upserts on a natural key, so
    // running the seed first would race the step that settles those ids.
    const restoreOrder =
      vi.mocked(restore.restoreDemoCatalog).mock.invocationCallOrder[0];
    const seedOrder = vi.mocked(seed.seedDemoCustomerData).mock.invocationCallOrder[0];
    expect(restoreOrder).toBeLessThan(seedOrder);
  });

  it('replaces the fallback ledger entry with one row per seeded order', async () => {
    const { resetDemoData } = await import('./reset');
    await resetDemoData();

    // Two writes: the wipe's fallback entry, then the real history. The
    // fallback exists so `resetDemoCustomerState` alone leaves a coherent
    // account; the second write is what makes the rewards rows add up to the
    // headline balance.
    expect(mocks.userUpdateOne).toHaveBeenCalledTimes(2);
    const [, secondWrite] = mocks.userUpdateOne.mock.calls;
    expect(secondWrite[1].$set.pointsHistory).toHaveLength(2);
    expect(secondWrite[1].$set.pointsHistory[0].orderId).toBe('order-1');
  });

  it('banks the sum of the seeded awards, not the fallback constant', async () => {
    const { resetDemoData, DEMO_FALLBACK_POINTS } = await import('./reset');
    await resetDemoData();

    const [, secondWrite] = mocks.userUpdateOne.mock.calls;
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
    await resetDemoData();

    // An empty catalog seeds no orders. Writing a zero balance over the
    // fallback would leave the rewards tab with nothing to demonstrate, so
    // the second write must not touch the points fields at all.
    const [, secondWrite] = mocks.userUpdateOne.mock.calls;
    expect(secondWrite[1].$set).not.toHaveProperty('rewardPoints');
    expect(secondWrite[1].$set).not.toHaveProperty('lifetimePoints');
    expect(secondWrite[1].$set).not.toHaveProperty('pointsHistory');
  });
});
