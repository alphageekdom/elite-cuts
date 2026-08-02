import { describe, expect, it } from 'vitest';

import OrderModel from '@/models/Order';
import { walkInPaymentResult } from '@/lib/orders/walk-in';
import { collectRefundIndices } from './collect-refund-indices';

// Two rules meet in this helper and they read the same order differently:
//
//   - the explicit-refund guard asks whether MONEY was collected,
//   - the cancel branch asks whether VALUE was applied (i.e. is there stock to
//     put back).
//
// A counter sale awaiting payment at the till is the one order where those
// disagree, and gating both on the second answer is what let an admin refund
// lines of an order the shop had never charged.
//
// Fixtures go through the real model so schema defaults can't diverge from a
// hand-written literal — the trap documented at length in payment-state.test.ts.
const order = (paymentResult: Record<string, unknown>, lines = 3) =>
  ({
    orderItems: Array.from({ length: lines }, () => ({ refunded: false })),
    paymentResult: new OrderModel({ paymentResult }).paymentResult,
  }) as never;

/** Counter sale, recorded but not yet paid for at the till. */
const unpaidWalkIn = () =>
  order(walkInPaymentResult({ isCompletedNow: false, totalCost: 100, now: new Date() }));

/** Counter sale the admin recorded as already collected. */
const paidWalkIn = () =>
  order(walkInPaymentResult({ isCompletedNow: true, totalCost: 100, now: new Date() }));

const paidCheckout = () =>
  order({ status: 'Completed', provider: 'stripe', amountPaid: 100, currency: 'USD' });

const abandonedCheckout = () =>
  order({
    status: 'Pending',
    provider: 'stripe',
    checkoutSessionId: 'cs_test_abc',
    amountPaid: 0,
    currency: 'USD',
  });

describe('collectRefundIndices — explicit refund guard', () => {
  it('refuses an explicit refund on an unpaid counter sale', async () => {
    // The regression. `hasSettledPayment` answers `true` for every walk-in, so
    // gating here on it left this guard permanently satisfied for exactly the
    // orders it exists to catch: the refund went through and the receipt read
    // "1 of 3 items refunded — $33.00 back to you" for money never charged.
    const result = collectRefundIndices({
      refundItemIndices: [0],
      transitioningToCancelled: false,
      existing: unpaidWalkIn(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({
      message: 'This order has not been paid, so there is nothing to refund.',
    });
  });

  it('still refuses an explicit refund on an abandoned checkout', () => {
    // The case the guard was originally written for — must not regress.
    expect(
      collectRefundIndices({
        refundItemIndices: [0],
        transitioningToCancelled: false,
        existing: abandonedCheckout(),
      }).ok,
    ).toBe(false);
  });

  it('allows an explicit refund once the counter sale has been paid', () => {
    const result = collectRefundIndices({
      refundItemIndices: [0, 2],
      transitioningToCancelled: false,
      existing: paidWalkIn(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.indicesToRefund]).toEqual([0, 2]);
  });

  it('allows an explicit refund on a paid checkout order', () => {
    const result = collectRefundIndices({
      refundItemIndices: [1],
      transitioningToCancelled: false,
      existing: paidCheckout(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.indicesToRefund]).toEqual([1]);
  });
});

describe('collectRefundIndices — cancellation', () => {
  it('still collects every line when cancelling an UNPAID counter sale', () => {
    // Deliberately unchanged, and the reason the two predicates can't be
    // merged: creation decremented this order's stock, so cancelling it must
    // still restock. `applyRefund` is what declines to stamp money onto it.
    const result = collectRefundIndices({
      transitioningToCancelled: true,
      existing: unpaidWalkIn(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.indicesToRefund]).toEqual([0, 1, 2]);
  });

  it('collects every line when cancelling a paid order', () => {
    const result = collectRefundIndices({
      transitioningToCancelled: true,
      existing: paidCheckout(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.indicesToRefund]).toEqual([0, 1, 2]);
  });

  it('collects nothing when cancelling an order that never applied value', () => {
    // An abandoned checkout took no stock, so restocking would invent it.
    const result = collectRefundIndices({
      transitioningToCancelled: true,
      existing: abandonedCheckout(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.indicesToRefund.size).toBe(0);
  });
});

describe('collectRefundIndices — index validation', () => {
  it('rejects an out-of-range index', () => {
    expect(
      collectRefundIndices({
        refundItemIndices: [3],
        transitioningToCancelled: false,
        existing: paidCheckout(),
      }).ok,
    ).toBe(false);
  });

  it('rejects refunding and unrefunding in the same request', () => {
    const existing = order(
      { status: 'Partially Refunded', provider: 'stripe', amountPaid: 66, currency: 'USD' },
      3,
    ) as unknown as { orderItems: { refunded: boolean }[] };
    existing.orderItems[1].refunded = true;

    expect(
      collectRefundIndices({
        refundItemIndices: [0],
        unrefundItemIndices: [1],
        transitioningToCancelled: false,
        existing: existing as never,
      }).ok,
    ).toBe(false);
  });
});
