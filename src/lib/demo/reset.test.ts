import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// reset.ts pulls in `server-only`, `connectDB`, and four Mongoose models.
// None of that runs cleanly outside Next's bundler / a live DB, so each
// gets stubbed. The tests exercise the orchestrator's two structural
// branches:
//   1. Demo customer not found → returns the zero-counts shape, never
//      touches downstream collections.
//   2. Demo customer found → calls deleteMany on each owned collection
//      with the demo customer's `_id` as the ownership filter, and
//      updates the User doc.
// End-to-end wipe behavior (what a real `deleteMany` actually clears in
// Mongo) is out of scope until the project gains mongodb-memory-server.

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

// Match the chained `.select('_id')` on the findOne result — return a
// thenable so `await` resolves to the user (or null).
const findOneChain = (result: unknown) => ({
  select: () => Promise.resolve(result),
});

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
      userReset: false,
    });

    // Critical guarantee: when the demo customer isn't found, NONE of the
    // owned-collection deletes should fire — otherwise a tampered or
    // empty-DB call could wipe across non-demo data.
    expect(mocks.orderDeleteMany).not.toHaveBeenCalled();
    expect(mocks.cartDeleteMany).not.toHaveBeenCalled();
    expect(mocks.savedCardDeleteMany).not.toHaveBeenCalled();
    expect(mocks.notificationDeleteMany).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
  });
});

describe('resetDemoCustomerState — demo customer found', () => {
  const demoId = 'demo-customer-id';

  beforeEach(() => {
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('scopes every delete by the demo customer id', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.orderDeleteMany).toHaveBeenCalledWith({ user: demoId });
    expect(mocks.cartDeleteMany).toHaveBeenCalledWith({ user: demoId });
    expect(mocks.savedCardDeleteMany).toHaveBeenCalledWith({ user: demoId });
    // Notification uses `userId`, not `user` — Phase B's exploration
    // flagged the schema inconsistency.
    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: demoId,
    });
  });

  it('clears the User-embedded state and resets balances to zero', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    await resetDemoCustomerState();

    expect(mocks.userUpdateOne).toHaveBeenCalledOnce();
    const [filter, update] = mocks.userUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: demoId });
    expect(update.$set).toMatchObject({
      savedCuts: [],
      addresses: [],
      rewardPoints: 0,
      lifetimePoints: 0,
      pointsHistory: [],
      tierAnniversaryAt: null,
      currentTier: null,
      dormancyWarnedAt: null,
      lastActiveAt: null,
    });
  });

  it('returns the per-collection counts from each deleteMany result', async () => {
    const { resetDemoCustomerState } = await import('./reset');
    const counts = await resetDemoCustomerState();

    expect(counts).toEqual({
      ordersDeleted: 3,
      cartDeleted: 1,
      savedCardsDeleted: 2,
      notificationsDeleted: 5,
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
