import type { Order } from '@/models/Order';
import { reverseOrderAward, reverseOrderRedemption } from '@/lib/orders/completion';
import { releasePromoSeat } from '@/lib/promos/apply';
import { hasSettledPayment } from '@/lib/orders/payment-state';

// Post-save cleanup for points + promo seats when an order leaves a paying
// state via refund or cancellation.
//
// - `reverseOrderAward` fires only if the order was Completed (points had
//   been awarded). Partial refunds that leave the order Completed don't
//   trigger it.
// - `reverseOrderRedemption` fires whenever a settled order had a redemption
//   stamped on it. NOTE: the points do NOT come out at checkout — the
//   checkout route validates the requested redemption against a read-only
//   balance and stamps the intent, and `completeSessionForOrder` is what
//   actually decrements `User.rewardPoints`. This comment used to say
//   otherwise, which is how cancelling a never-paid order came to hand back
//   points the customer had never spent.
// - Promo seat returns to the pool only on full cancellation — partial
//   refunds leave the seat consumed since the customer still benefited from
//   the code on the surviving line items. The seat is reserved in
//   `completeSessionForOrder` too, so an unpaid order holds no seat to
//   release.
//
// Everything here is therefore gated on `hasSettledPayment`: an order whose
// payment never landed has no awarded points, no spent points and no promo
// seat, so there is nothing to reverse.
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
    | 'paymentResult'
  >;
  finalStatus: string;
  indicesToRefund: Set<number>;
  transitioningToCancelled: boolean;
}): Promise<void> {
  if (!hasSettledPayment(existing)) return;

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
