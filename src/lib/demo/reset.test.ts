import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';
import { DEMO_STAFF } from './seed/staff';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { DEMO_SHOP_SETTINGS } from './seed/settings';

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

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userUpdateOne: vi.fn(),
  orderDeleteMany: vi.fn(),
  cartDeleteMany: vi.fn(),
  savedCardDeleteMany: vi.fn(),
  notificationDeleteMany: vi.fn(),
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

vi.mock('@/models/Product', () => ({
  default: {
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

// ── Catalog restore ─────────────────────────────────────────────────────
// `restoreDemoCatalog` deletes-then-inserts each shared collection from
// the TypeScript seed snapshot. The tests check structural guarantees:
// every step calls deleteMany before insertMany (or Model.create), the
// counts come back from the returned shapes, and shifts are scoped to
// the current week's start.

function stubCatalogHappyPath(): void {
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

describe('restoreDemoCatalog', () => {
  beforeEach(() => {
    stubCatalogHappyPath();
  });

  it('deletes every shared collection before inserting the seed snapshot', async () => {
    const { restoreDemoCatalog } = await import('./reset');
    await restoreDemoCatalog();

    expect(mocks.productDeleteMany).toHaveBeenCalledWith({});
    expect(mocks.productCreate).toHaveBeenCalledWith(DEMO_PRODUCTS);
    expect(mocks.promoDeleteMany).toHaveBeenCalledWith({});
    expect(mocks.staffDeleteMany).toHaveBeenCalledWith({});
    expect(mocks.staffInsertMany).toHaveBeenCalledWith(DEMO_STAFF);
    expect(mocks.eventDeleteMany).toHaveBeenCalledWith({});
  });

  it('stamps usageCount=0 on every restored promo', async () => {
    const { restoreDemoCatalog } = await import('./reset');
    await restoreDemoCatalog();

    const inserted = mocks.promoInsertMany.mock.calls[0][0] as Array<{
      code: string;
      usageCount: number;
    }>;
    expect(inserted).toHaveLength(DEMO_PROMOS.length);
    for (const promo of inserted) {
      expect(promo.usageCount).toBe(0);
    }
  });

  it('scopes shift delete + insert to the current Monday-UTC week', async () => {
    const { restoreDemoCatalog } = await import('./reset');
    await restoreDemoCatalog();

    const expectedWeekStart = currentWeekStartUtc();
    expect(mocks.shiftDeleteMany).toHaveBeenCalledWith({
      weekStart: expectedWeekStart,
    });

    const insertedShifts = mocks.shiftInsertMany.mock.calls[0][0] as Array<{
      weekStart: Date;
    }>;
    expect(insertedShifts).toHaveLength(DEMO_SHIFTS.length);
    for (const shift of insertedShifts) {
      expect(shift.weekStart).toEqual(expectedWeekStart);
    }
  });

  it('upserts settings with the seed payload', async () => {
    const { restoreDemoCatalog } = await import('./reset');
    await restoreDemoCatalog();

    expect(mocks.settingsFindOneAndUpdate).toHaveBeenCalledWith(
      {},
      DEMO_SHOP_SETTINGS,
      expect.objectContaining({ upsert: true }),
    );
  });

  it('returns the per-collection delete + restore counts', async () => {
    const { restoreDemoCatalog } = await import('./reset');
    const counts = await restoreDemoCatalog();

    expect(counts).toEqual({
      productsDeleted: 12,
      productsRestored: DEMO_PRODUCTS.length,
      promosDeleted: 3,
      promosRestored: DEMO_PROMOS.length,
      staffDeleted: 4,
      staffRestored: DEMO_STAFF.length,
      shiftsDeleted: 30,
      shiftsRestored: DEMO_SHIFTS.length,
      eventsDeleted: 2,
      eventsRestored: 0,
      settingsRestored: true,
    });
  });

  it('tolerates a missing deletedCount and reports zero for that collection', async () => {
    mocks.productDeleteMany.mockResolvedValue({}); // no deletedCount returned
    const { restoreDemoCatalog } = await import('./reset');
    const counts = await restoreDemoCatalog();

    expect(counts.productsDeleted).toBe(0);
    expect(counts.productsRestored).toBe(DEMO_PRODUCTS.length);
  });
});

// ── Top-level orchestrator + idempotency ───────────────────────────────
// `resetDemoData` composes the customer wipe and catalog restore. The
// idempotency test runs it twice with the same mocks and asserts the
// returned counts are identical — the contract the cron relies on.

describe('resetDemoData', () => {
  const demoId = 'demo-customer-id';

  beforeEach(() => {
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));
    mocks.orderDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    stubCatalogHappyPath();
  });

  it('merges customer + catalog counts into one envelope', async () => {
    const { resetDemoData } = await import('./reset');
    const counts = await resetDemoData();

    expect(counts).toMatchObject({
      // Customer wipe
      ordersDeleted: 3,
      cartDeleted: 1,
      savedCardsDeleted: 2,
      notificationsDeleted: 5,
      userReset: true,
      // Catalog restore
      productsRestored: DEMO_PRODUCTS.length,
      promosRestored: DEMO_PROMOS.length,
      staffRestored: DEMO_STAFF.length,
      shiftsRestored: DEMO_SHIFTS.length,
      settingsRestored: true,
    });
  });

  it('produces the same end state when run twice in a row (idempotency)', async () => {
    const { resetDemoData } = await import('./reset');
    const first = await resetDemoData();
    const second = await resetDemoData();
    expect(second).toEqual(first);
  });
});
