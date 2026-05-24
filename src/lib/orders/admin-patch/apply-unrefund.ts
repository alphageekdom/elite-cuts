import { NextResponse } from 'next/server';

import type { OrderItem, Order } from '@/models/Order';
import Product from '@/models/Product';
import { refundSummary, paymentStatusFor } from '@/lib/order-refunds';
import { roundMoney } from '@/lib/money';
import type { BranchResult } from './types';

// Reverses a set of line-level refunds. Stock is de-decremented atomically
// under a `stockCount: { $gte: qty }` guard so a sold-out cut can't undo
// its own refund (and the admin sees a 409 instead of negative stock).
//
// `indicesToUnrefund` must be non-empty.
export async function applyUnrefund({
  existing,
  indicesToUnrefund,
  baseItems,
}: {
  existing: Pick<
    Order,
    'orderItems' | 'subtotal' | 'tax' | 'totalCost' | 'paymentResult'
  >;
  indicesToUnrefund: Set<number>;
  baseItems: OrderItem[];
}): Promise<BranchResult> {
  const unrefundOps = Array.from(indicesToUnrefund).map((idx) => ({
    updateOne: {
      filter: {
        _id: existing.orderItems[idx].product,
        stockCount: { $gte: existing.orderItems[idx].qty },
      },
      update: { $inc: { stockCount: -existing.orderItems[idx].qty } },
    },
  }));
  const stockResult = await Product.bulkWrite(unrefundOps);
  if (stockResult.modifiedCount !== indicesToUnrefund.size) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Cannot undo refund — insufficient current stock for one or more items' },
        { status: 409 },
      ),
    };
  }

  const nextOrderItems = baseItems.map((item, idx) =>
    indicesToUnrefund.has(idx) ? { ...item, refunded: false, refundedAt: undefined } : item,
  );

  const summary = refundSummary(nextOrderItems, {
    subtotal: existing.subtotal,
    tax: existing.tax,
    totalCost: existing.totalCost,
  });
  const nextPaymentStatus =
    summary.refundedCount === 0
      ? 'Completed'
      : paymentStatusFor(existing.paymentResult.status, summary);

  const updateFields: Record<string, unknown> = {
    orderItems: nextOrderItems,
    'paymentResult.status': nextPaymentStatus,
    'paymentResult.paymentDate': new Date(),
    'paymentResult.amountPaid':
      nextPaymentStatus === 'Refunded'
        ? 0
        : Math.max(0, roundMoney(existing.totalCost - summary.refundedAmount)),
  };

  return { ok: true, updateFields };
}
