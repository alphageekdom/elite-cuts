import type { Order } from '@/models/Order';
import { reverseOrderAward, reverseOrderRedemption } from '@/lib/order-completion';
import { releasePromoSeat } from '@/lib/promos/apply';

// Post-save cleanup for points + promo seats when an order leaves a paying
// state via refund or cancellation.
//
// - `reverseOrderAward` fires only if the order was Completed (points had
//   been awarded). Partial refunds that leave the order Completed don't
//   trigger it.
// - `reverseOrderRedemption` fires whenever the order had a redemption
//   stamped at checkout, regardless of whether it ever reached Completed —
//   the customer's points came out of their balance at checkout time, so
//   they must come back when the order is cancelled.
// - Promo seat returns to the pool only on full cancellation — partial
//   refunds leave the seat consumed since the customer still benefited from
//   the code on the surviving line items.
export async function reverseRewards({
  orderId,
  existing,
  finalStatus,
  indicesToRefund,
  transitioningToCancelled,
}: {
  orderId: string;
  existing: Pick<
    Order,
    | 'orderStatus'
    | 'orderItems'
    | 'subtotal'
    | 'pointsAwarded'
    | 'pointsRedeemed'
    | 'promoId'
  >;
  finalStatus: string;
  indicesToRefund: Set<number>;
  transitioningToCancelled: boolean;
}): Promise<void> {
  const cancelledNow =
    finalStatus === 'Cancelled' && existing.orderStatus !== 'Cancelled';

  // Partial refund (NOT cascading to cancel) on an order with redemption:
  // proportionally return the redeemed points based on the just-refunded
  // subtotal vs the original subtotal. The full-cancel branch below
  // handles any remaining un-returned points if/when the order later
  // cancels entirely.
  if (
    indicesToRefund.size > 0 &&
    !cancelledNow &&
    (existing.pointsRedeemed ?? 0) > 0 &&
    existing.subtotal > 0
  ) {
    const newlyRefundedSubtotal = Array.from(indicesToRefund).reduce(
      (sum, idx) => sum + existing.orderItems[idx].price * existing.orderItems[idx].qty,
      0,
    );
    const proportion = newlyRefundedSubtotal / existing.subtotal;
    const pointsToReturn = Math.floor((existing.pointsRedeemed ?? 0) * proportion);
    if (pointsToReturn > 0) {
      await reverseOrderRedemption({
        orderId,
        reason: 'refund_reverse',
        pointsToReturn,
      });
    }
  }

  if (cancelledNow) {
    const reverseReason =
      indicesToRefund.size > 0 && !transitioningToCancelled
        ? 'refund_reverse'
        : 'cancel_reverse';
    if (existing.orderStatus === 'Completed' && (existing.pointsAwarded ?? 0) > 0) {
      await reverseOrderAward({ orderId, reason: reverseReason });
    }
    if ((existing.pointsRedeemed ?? 0) > 0) {
      await reverseOrderRedemption({ orderId, reason: reverseReason });
    }
    if (existing.promoId) {
      await releasePromoSeat(existing.promoId);
    }
  }
}
