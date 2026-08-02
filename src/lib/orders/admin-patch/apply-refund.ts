import { NextResponse } from 'next/server';

import type { OrderItem, Order } from '@/models/Order';
import Product from '@/models/Product';
import {
  allocateRefund,
  netCollected,
  paymentStatusFor,
  refundSummary,
} from '@/lib/orders/refunds';
import { roundMoney } from '@/lib/money';
import { hasCollectedPayment } from '@/lib/orders/payment-state';
import { dollarsToCents, getStripe, isStubMode } from '@/lib/payments/stripe';
import type { BranchResult } from './types';

// Applies a set of newly-refunded line indices to an order. Hits Stripe's
// refund API BEFORE any DB write so a Stripe failure leaves the schema
// clean (admin sees an error and can retry). On Stripe success, atomically
// restocks the refunded items and assembles the next `orderItems` plus
// `paymentResult.*` updateFields. If the cumulative refund drains the
// order to fully refunded and the admin didn't explicitly set a status,
// the helper mirrors a direct cancellation so the two paths converge.
//
// `indicesToRefund` must be non-empty — the caller is responsible for the
// short-circuit when no refund is needed.
export async function applyRefund({
  orderId,
  existing,
  indicesToRefund,
  explicitOrderStatus,
  refundedAt,
}: {
  orderId: string;
  existing: Pick<
    Order,
    | 'orderItems'
    | 'subtotal'
    | 'tax'
    | 'totalCost'
    | 'paymentResult'
    | 'orderStatus'
    | 'cancelledAt'
  >;
  indicesToRefund: Set<number>;
  explicitOrderStatus: string | undefined;
  refundedAt: Date;
}): Promise<BranchResult> {
  const projectedItems: OrderItem[] = existing.orderItems.map((item, idx) =>
    indicesToRefund.has(idx) ? { ...item, refunded: true, refundedAt } : item,
  );
  // Cap against what the shop actually collected, not the original estimate —
  // auto-settlement may have captured more or refunded some of it back since.
  const collected = netCollected(
    existing.totalCost,
    existing.paymentResult.settlementPaymentIntents,
  );
  const refundContext = {
    subtotal: existing.subtotal,
    tax: existing.tax,
    totalCost: collected,
  };
  const previousSummary = refundSummary(existing.orderItems, refundContext);
  const projectedSummary = refundSummary(projectedItems, refundContext);
  const refundDeltaDollars = Math.max(
    0,
    projectedSummary.refundedAmount - previousSummary.refundedAmount,
  );

  const provider = existing.paymentResult.provider;
  // An order the shop never charged. Today every such order is a counter sale
  // (`provider: 'admin'`), so the Stripe gate below would skip it anyway — but
  // relying on that means the safety lives in a coincidence of two unrelated
  // fields. Stated outright so asking Stripe to refund a charge that was never
  // made stays impossible if either field ever moves.
  const collectedPayment = hasCollectedPayment(existing);

  // Hit Stripe first so a failed refund leaves the schema clean.
  if (
    refundDeltaDollars > 0 &&
    collectedPayment &&
    provider === 'stripe' &&
    existing.paymentResult.paymentIntentId &&
    !isStubMode()
  ) {
    try {
      const stripe = getStripe();
      // Money for a settled order can sit across several intents (the
      // original charge plus any at-pickup capture), so draw the amount owed
      // from each in turn rather than assuming the original holds it all.
      const allocations = allocateRefund({
        paymentIntentId: existing.paymentResult.paymentIntentId,
        totalCost: existing.totalCost,
        settlements: existing.paymentResult.settlementPaymentIntents,
        alreadyRefunded: previousSummary.refundedAmount,
        amount: refundDeltaDollars,
      });
      for (const allocation of allocations) {
        await stripe.refunds.create({
          payment_intent: allocation.paymentIntentId,
          amount: dollarsToCents(allocation.amount),
          reason: 'requested_by_customer',
          metadata: {
            orderId,
            refundedLineIndices: Array.from(indicesToRefund).join(','),
          },
        });
      }
    } catch (err) {
      // Don't echo Stripe's raw error message to the client — it can
      // reveal masked PAN tails, declined-reason hints, and account
      // names that have no business on an admin toast.
      console.error('[orders PATCH] stripe.refunds.create failed', err);
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Refund could not be processed — please try again or contact support.' },
          { status: 502 },
        ),
      };
    }
  }

  // Atomic restock — mirror the order-creation bulkWrite pattern in reverse.
  // A hard-deleted product (admin-only path) silently no-ops the matching
  // `updateOne`, so we log the mismatch instead of pretending every line
  // restocked. We don't reverse the Stripe refund — the customer is owed
  // regardless — but the audit log shouldn't claim a clean restock.
  const stockResult = await Product.bulkWrite(
    Array.from(indicesToRefund).map((idx) => ({
      updateOne: {
        filter: { _id: existing.orderItems[idx].product },
        update: { $inc: { stockCount: existing.orderItems[idx].qty } },
      },
    })),
  );
  if (stockResult.modifiedCount !== indicesToRefund.size) {
    console.warn(
      '[orders PATCH] applyRefund restocked %d of %d lines — likely a missing product reference',
      stockResult.modifiedCount,
      indicesToRefund.size,
    );
  }

  // Nothing was ever collected — a counter sale cancelled before the customer
  // paid at the till. The restock above is right (creation took the stock), but
  // everything below this line is about money, and there is none to move:
  // stamping it marked the lines refunded, flipped the payment to 'Refunded'
  // and rendered "Refunded (3 items) −$100.00 / Net paid $0.00" on the
  // customer's receipt for an order the shop never charged.
  //
  // Returning no `orderItems` leaves the lines unmarked, which is what keeps
  // that block off the receipt — it renders on `refundedAmount > 0`, derived
  // from the refunded flags. The order's own `Cancelled` status carries the
  // real signal, and the payment is left at `Pending`: slightly odd on a
  // cancelled order, but honest, and a new terminal status would ripple through
  // the drawer, the receipt and the exports for signal already present.
  //
  // Only reachable via cancellation — `collectRefundIndices` refuses an
  // explicit refund on an uncollected order before it ever gets here.
  if (!collectedPayment) {
    return { ok: true, updateFields: {} };
  }

  const updateFields: Record<string, unknown> = {
    orderItems: projectedItems,
  };

  const nextPaymentStatus = paymentStatusFor(
    existing.paymentResult.status,
    projectedSummary,
  );

  updateFields['paymentResult.status'] = nextPaymentStatus;
  updateFields['paymentResult.paymentDate'] = refundedAt;
  updateFields['paymentResult.amountPaid'] =
    nextPaymentStatus === 'Refunded'
      ? 0
      : Math.max(0, roundMoney(collected - projectedSummary.refundedAmount));

  // If individual refunds have drained the order to fully refunded and the
  // admin didn't explicitly pick an orderStatus this request, mirror what
  // a direct cancellation would do so the two paths converge.
  if (
    nextPaymentStatus === 'Refunded' &&
    !explicitOrderStatus &&
    existing.orderStatus !== 'Cancelled'
  ) {
    updateFields.orderStatus = 'Cancelled';
    updateFields.cancellationReason = null;
    if (!existing.cancelledAt) {
      updateFields.cancelledAt = refundedAt;
    }
  }

  return { ok: true, updateFields };
}
