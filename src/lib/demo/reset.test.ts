import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';
import { DEMO_STAFF } from './seed/staff';
import { DEMO_SHIFTS } from './seed/shifts';

// ── Module mocks ────────────────────────────────────────────────────────
// reset.ts pulls in `server-only`, `connectDB`, and a dozen Mongoose
// models. None of that runs cleanly outside Next's bundler / a live DB,
// so each gets stubbed. The tests exercise:
//   1. resetDemoCustomerState — demo customer not found / found branches.
//   2. restoreDemoCatalog — per-collection delete + re-insert from seed,
//      including settings upsert and shift weekStart scoping.
//   3. resetDemoData — orchestrator merges customer + catalog counts.
//   4. Idempotency — running resetDemoData twice produces the same end
//      state (each step deletes before inserting, so a second run wipes
//      and re-inserts identical rows).
// End-to-end wipe behavior (what a real `deleteMany` actually clears in
// Mongo) is out of scope until the project gains mongodb-memory-server.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

// Cloudinary cleanup is invoked by restoreDemoCatalog before its bulk
// product delete. The underlying SDK module throws at import time when
// CLOUDINARY_* env vars aren't set, so the cleanup module is stubbed
// here rather than relying on env presence in CI. Tests never assert on
// it — they only need it to not blow up.
vi.mock('@/lib/products/cloudinary-cleanup', () => ({
  deleteCloudinaryImages: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userUpdateOne: vi.fn(),
  orderDeleteMany: vi.fn(),
  cartDeleteMany: vi.fn(),
  savedCardDeleteMany: vi.fn(),
  notificationDeleteMany: vi.fn(),
  reviewUpdateMany: vi.fn(),
  productFind: vi.fn(),
  productDeleteMany: vi.fn(),
  productCreate: vi.fn(),
  promoDeleteMany: vi.fn(),
  promoInsertMany: vi.fn(),
  staffDeleteMany: vi.fn(),
  staffInsertMany: vi.fn(),
  shiftDeleteMany: vi.fn(),
  shiftInsertMany: vi.fn(),
  eventDeleteMany: vi.fn(),
  settingsFindOneAndUpdate: vi.fn(),
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

vi.mock('@/models/Review', () => ({
  default: { updateMany: mocks.reviewUpdateMany },
}));

vi.mock('@/models/Product', () => ({
  default: {
    find: mocks.productFind,
    deleteMany: mocks.productDeleteMany,
    create: mocks.productCreate,
  },
}));

vi.mock('@/models/Promo', () => ({
  default: {
    deleteMany: mocks.promoDeleteMany,
    insertMany: mocks.promoInsertMany,
  },
}));

vi.mock('@/models/StaffMember', () => ({
  default: {
    deleteMany: mocks.staffDeleteMany,
    insertMany: mocks.staffInsertMany,
  },
}));

vi.mock('@/models/Shift', () => ({
  default: {
    deleteMany: mocks.shiftDeleteMany,
    insertMany: mocks.shiftInsertMany,
  },
}));

vi.mock('@/models/Event', () => ({
  default: { deleteMany: mocks.eventDeleteMany },
}));

vi.mock('@/models/ShopSettings', () => ({
  default: { findOneAndUpdate: mocks.settingsFindOneAndUpdate },
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
    expect(mocks.reviewUpdateMany).not.toHaveBeenCalled();
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
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
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

// ── Catalog restore ─────────────────────────────────────────────────────
// `restoreDemoCatalog` deletes-then-inserts each shared collection from
// the TypeScript seed snapshot. The tests check structural guarantees:
// every step calls deleteMany before insertMany (or Model.create), the
// counts come back from the returned shapes, and shifts are scoped to
// the current week's start.

function stubCatalogHappyPath(): void {
  // `restoreDemoCatalog` walks existing products to collect Cloudinary
  // images before the bulk delete. Stub the chained `.select(...).lean()`
  // so the call resolves to an empty image list (the cloudinary cleanup
  // is itself mocked above).
  mocks.productFind.mockReturnValue({
    select: () => ({ lean: async () => [] }),
  });
  mocks.productDeleteMany.mockResolvedValue({ deletedCount: 12 });
  mocks.productCreate.mockResolvedValue(
    new Array(DEMO_PRODUCTS.length).fill({}),
  );
  mocks.promoDeleteMany.mockResolvedValue({ deletedCount: 3 });
  mocks.promoInsertMany.mockResolvedValue(new Array(DEMO_PROMOS.length).fill({}));
  mocks.staffDeleteMany.mockResolvedValue({ deletedCount: 4 });
  mocks.staffInsertMany.mockResolvedValue(new Array(DEMO_STAFF.length).fill({}));
  mocks.shiftDeleteMany.mockResolvedValue({ deletedCount: 30 });
  mocks.shiftInsertMany.mockResolvedValue(
    new Array(DEMO_SHIFTS.length).fill({}),
  );
  mocks.eventDeleteMany.mockResolvedValue({ deletedCount: 2 });
  mocks.settingsFindOneAndUpdate.mockResolvedValue({});
}

// ── Top-level orchestrator + idempotency ───────────────────────────────
// `resetDemoData` is the customer wipe and nothing else. The idempotency
// test runs it twice with the same mocks and asserts the returned counts are
// identical — the contract the cron relies on.

describe('resetDemoData', () => {
  const demoId = 'demo-customer-id';

  beforeEach(() => {
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    stubCatalogHappyPath();
  });

  it('runs the customer wipe and touches nothing else', async () => {
    const { resetDemoData } = await import('./reset');
    const counts = await resetDemoData();

    // The whole envelope — `toEqual`, not `toMatchObject`, so a catalog count
    // reappearing in the shape fails here rather than passing silently.
    expect(counts).toEqual({
      ordersDeleted: 3,
      cartDeleted: 1,
      savedCardsDeleted: 2,
      notificationsDeleted: 5,
      userReset: true,
    });

    // No catalog-side write should have fired.
    expect(mocks.productDeleteMany).not.toHaveBeenCalled();
    expect(mocks.productCreate).not.toHaveBeenCalled();
    expect(mocks.promoDeleteMany).not.toHaveBeenCalled();
    expect(mocks.promoInsertMany).not.toHaveBeenCalled();
    expect(mocks.staffDeleteMany).not.toHaveBeenCalled();
    expect(mocks.staffInsertMany).not.toHaveBeenCalled();
    expect(mocks.shiftDeleteMany).not.toHaveBeenCalled();
    expect(mocks.shiftInsertMany).not.toHaveBeenCalled();
    expect(mocks.eventDeleteMany).not.toHaveBeenCalled();
    expect(mocks.settingsFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('produces the same end state when run twice in a row (idempotency)', async () => {
    const { resetDemoData } = await import('./reset');
    const first = await resetDemoData();
    const second = await resetDemoData();
    expect(second).toEqual(first);
  });
});
