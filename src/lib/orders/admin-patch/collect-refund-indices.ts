import { NextResponse } from 'next/server';

import type { Order } from '@/models/Order';

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
  existing: Pick<Order, 'orderItems'>;
}): RefundIndexResult {
  const indicesToRefund = new Set<number>();
  const indicesToUnrefund = new Set<number>();
  const itemCount = existing.orderItems.length;

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

  // Cancellation transitions auto-refund every still-unrefunded item.
  if (transitioningToCancelled) {
    existing.orderItems.forEach((item, idx) => {
      if (!item.refunded) indicesToRefund.add(idx);
    });
  }

  return { ok: true, indicesToRefund, indicesToUnrefund };
}
