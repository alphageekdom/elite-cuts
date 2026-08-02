import { NextResponse } from 'next/server';

import type { Order } from '@/models/Order';
import {
  hasCollectedPayment,
  hasSettledPayment,
} from '@/lib/orders/payment-state';

// Validates the refundItemIndices / unrefundItemIndices arrays and folds
// in the implicit "cancel auto-refunds every still-unrefunded line" rule.
// Returns the two sets the route then hands to the refund / unrefund
// branches, or an early-return 400 on a bad index.
export type RefundIndexResult =
  | {
      ok: true;
      indicesToRefund: Set<number>;
      indicesToUnrefund: Set<number>;
    }
  | { ok: false; response: NextResponse };

export function collectRefundIndices({
  refundItemIndices,
  unrefundItemIndices,
  transitioningToCancelled,
  existing,
}: {
  refundItemIndices?: number[];
  unrefundItemIndices?: number[];
  transitioningToCancelled: boolean;
  existing: Pick<Order, 'orderItems' | 'paymentResult'>;
}): RefundIndexResult {
  const indicesToRefund = new Set<number>();
  const indicesToUnrefund = new Set<number>();
  const itemCount = existing.orderItems.length;

  // An explicit refund against an order that was never charged is a mistake
  // worth naming rather than silently dropping — unlike the cancel path
  // below, the admin asked for this one directly.
  //
  // Gates on `hasCollectedPayment`, NOT `hasSettledPayment`. The latter answers
  // `true` for every counter sale, including one still awaiting payment at the
  // till, so this guard read as satisfied for exactly the orders it exists to
  // catch: refunding 1 of 3 lines on an unpaid walk-in sailed straight through
  // and printed "1 of 3 items refunded — $33.00 back to you" on the receipt.
  if (
    Array.isArray(refundItemIndices) &&
    refundItemIndices.length > 0 &&
    !hasCollectedPayment(existing)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'This order has not been paid, so there is nothing to refund.' },
        { status: 400 },
      ),
    };
  }

  if (Array.isArray(refundItemIndices)) {
    for (const idx of refundItemIndices) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= itemCount) {
        return {
          ok: false,
          response: NextResponse.json(
            { message: 'Invalid refundItemIndices' },
            { status: 400 },
          ),
        };
      }
      if (!existing.orderItems[idx].refunded) indicesToRefund.add(idx);
    }
  }

  if (Array.isArray(unrefundItemIndices)) {
    for (const idx of unrefundItemIndices) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= itemCount) {
        return {
          ok: false,
          response: NextResponse.json(
            { message: 'Invalid unrefundItemIndices' },
            { status: 400 },
          ),
        };
      }
      if (existing.orderItems[idx].refunded) indicesToUnrefund.add(idx);
    }
  }

  if (indicesToRefund.size > 0 && indicesToUnrefund.size > 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Cannot refund and unrefund items in the same request' },
        { status: 400 },
      ),
    };
  }

  // Cancellation transitions auto-refund every still-unrefunded item — but
  // only when there is something to refund. A checkout order that never got
  // past Pending was never charged and never had its stock decremented, so
  // "refunding" it would restock inventory that was never taken and stamp a
  // refund that never happened. Cancelling it is a bare status flip, which is
  // exactly what the webhook's own expiry path does.
  //
  // Deliberately still `hasSettledPayment`, unlike the guard above. This branch
  // decides whether to RESTOCK, and a counter sale took its stock at creation
  // whether or not it has been paid for — so an unpaid walk-in belongs here.
  // `applyRefund` is what then declines to stamp money onto it.
  if (transitioningToCancelled && hasSettledPayment(existing)) {
    existing.orderItems.forEach((item, idx) => {
      if (!item.refunded) indicesToRefund.add(idx);
    });
  }

  return { ok: true, indicesToRefund, indicesToUnrefund };
}
