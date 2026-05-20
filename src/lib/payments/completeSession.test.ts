import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// completeSession.ts pulls in `server-only` (a Next.js marker) and a
// handful of Mongoose models. None of that runs naturally outside Next's
// bundler / a live DB, so each is stubbed to the minimum surface the SUT
// touches. The test exercises the atomic-claim branch in isolation — the
// happy path's stock/promo/points side-effects are out of scope for this
// pass (would warrant mongodb-memory-server when those land).

vi.mock('server-only', () => ({}));

vi.mock('mongoose', async () => {
  // Keep type identity, just neutralise the side-effecty bits.
  const Types = { ObjectId: class {} };
  return {
    default: { isValidObjectId: vi.fn(() => true), Types },
    isValidObjectId: vi.fn(() => true),
    Types,
  };
});

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

// vi.mock factories are hoisted above local consts, so the shared mock
// fns must be declared via vi.hoisted to land in the same scope. Both the
// atomic claim (Order.findOneAndUpdate) and its disambiguation
// (Order.exists) are mock fns the test can drive per case.
const mocks = vi.hoisted(() => ({
  orderFindOneAndUpdate: vi.fn(),
  orderExists: vi.fn(),
  productFindOneAndUpdate: vi.fn(),
  productBulkWrite: vi.fn(),
}));

vi.mock('@/models/Order', () => ({
  default: {
    findOneAndUpdate: mocks.orderFindOneAndUpdate,
    exists: mocks.orderExists,
  },
}));

vi.mock('@/models/Product', () => ({
  default: {
    findOneAndUpdate: mocks.productFindOneAndUpdate,
    bulkWrite: mocks.productBulkWrite,
  },
}));

vi.mock('@/models/User', () => ({
  default: { findByIdAndUpdate: vi.fn(async () => undefined) },
}));

vi.mock('@/models/Cart', () => ({
  default: { findOneAndUpdate: vi.fn(async () => undefined) },
}));

vi.mock('@/lib/promos/apply', () => ({
  reservePromoSeat: vi.fn(async () => true),
}));

vi.mock('@/lib/accountDeletion', () => ({
  recordCustomerActivity: vi.fn(async () => undefined),
}));

vi.mock('@/lib/order-notifications', () => ({
  notifyAdminsOfNewOrder: vi.fn(async () => undefined),
}));

vi.mock('@/lib/payments/stripe', () => ({
  dollarsToCents: (n: number) => Math.round(n * 100),
}));

// ── System under test ────────────────────────────────────────────────────
// Imported after the mocks above for readability. Vitest hoists vi.mock
// so the order here doesn't actually matter at runtime — every mock
// resolves before the SUT's transitive imports load.
import { completeSessionForOrder } from './completeSession';

// A minimal "Pending order" doc — the SUT mutates these fields in place
// during the happy path and calls .save() at the end. Stock side-effects
// are skipped here by providing an empty orderItems array, which keeps the
// test focused on the atomic-claim semantics.
const makePendingOrderDoc = () => ({
  _id: 'order-1',
  orderItems: [],
  totalCost: 50,
  promoId: null,
  user: null,
  pointsRedeemed: 0,
  isPaid: false,
  paidAt: null,
  paymentResult: { status: 'Pending', amountPaid: 0 } as Record<string, unknown>,
  orderStatus: 'Pending',
  cancellationReason: null,
  cancelledAt: null,
  save: vi.fn(async function (this: { paymentResult: { status: string } }) {
    return this;
  }),
});

describe('completeSessionForOrder — atomic claim semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes a Pending order to paid on the first call', async () => {
    const doc = makePendingOrderDoc();
    mocks.orderFindOneAndUpdate.mockResolvedValueOnce(doc);
    // Empty orderItems → decrementStockOrFail returns ok with no products
    // touched, the happy path runs through and flips the order to paid.

    const result = await completeSessionForOrder({
      orderId: 'order-1',
      paymentIntentId: 'pi_test_123',
      issueRefund: vi.fn(),
    });

    expect(result).toEqual({ ok: true, status: 'paid', orderId: 'order-1' });
    expect(doc.isPaid).toBe(true);
    expect(doc.paymentResult.status).toBe('Completed');
    expect(doc.paymentResult.paymentIntentId).toBe('pi_test_123');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('returns already_advanced on a duplicate webhook for the same order', async () => {
    // First call wins the claim — second call's filter doesn't match
    // (status is no longer Pending) so findOneAndUpdate returns null.
    // The disambiguation Order.exists confirms the doc is there.
    mocks.orderFindOneAndUpdate.mockResolvedValueOnce(null);
    mocks.orderExists.mockResolvedValueOnce({ _id: 'order-1' });
    const issueRefund = vi.fn();

    const result = await completeSessionForOrder({
      orderId: 'order-1',
      paymentIntentId: 'pi_test_123',
      issueRefund,
    });

    expect(result).toEqual({
      ok: false,
      status: 'already_advanced',
      orderId: 'order-1',
    });
    // Side effects must NOT run on the duplicate — no refund issued, no
    // stock touched, no admin notification, no points deduction.
    expect(issueRefund).not.toHaveBeenCalled();
    expect(mocks.productFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns not_found when no order exists for the given id', async () => {
    mocks.orderFindOneAndUpdate.mockResolvedValueOnce(null);
    mocks.orderExists.mockResolvedValueOnce(null);

    const result = await completeSessionForOrder({
      orderId: 'order-1',
      issueRefund: vi.fn(),
    });

    expect(result).toEqual({ ok: false, status: 'not_found' });
  });

  it('claims with the exact Pending → Authorized filter', async () => {
    // The atomic guarantee comes from the filter shape — the second call
    // bailing depends on the first call having already flipped the status.
    // Lock in the filter so a refactor can't silently widen it.
    mocks.orderFindOneAndUpdate.mockResolvedValueOnce(makePendingOrderDoc());

    await completeSessionForOrder({
      orderId: 'order-1',
      issueRefund: vi.fn(),
    });

    const [filter, update] = mocks.orderFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({
      _id: 'order-1',
      'paymentResult.status': 'Pending',
    });
    expect(update).toEqual({
      $set: { 'paymentResult.status': 'Authorized' },
    });
  });
});
