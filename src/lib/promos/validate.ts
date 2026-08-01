import 'server-only';

import { Types } from 'mongoose';

import connectDB from '@/config/database';
// The one rate — a local copy could drift from what checkout actually applies.
import { MEMBER_DISCOUNT_RATE } from '@/lib/pricing';
import Order from '@/models/Order';
import Promo, {
  type PromoDocument,
  type PromoFailureReason,
} from '@/models/Promo';

export type ValidatePromoInput = {
  code: string;
  userId?: string | Types.ObjectId | null;
  subtotalCents: number;
  // True when the customer is a logged-in member and the 5% member discount
  // would otherwise apply. Drives the post-member-discount base for percent
  // promos and is suppressed when the promo carries excludesMember.
  isMember?: boolean;
};

export type PromoValidationResult =
  | { valid: true; discountCents: number; promo: PromoDocument }
  | { valid: false; reason: PromoFailureReason };

// Pure validator: reads the DB, never writes. Same function runs on the
// apply endpoint (Phase 1B) and again at order placement (Phase 1C) so a
// stale client-side discount can never sneak past the server.
export async function validatePromo(
  input: ValidatePromoInput,
): Promise<PromoValidationResult> {
  await connectDB();

  const normalizedCode = input.code.trim().toUpperCase();
  if (!normalizedCode) return { valid: false, reason: 'not_found' };

  const promo = await Promo.findOne({ code: normalizedCode });
  if (!promo) return { valid: false, reason: 'not_found' };
  if (!promo.isActive) return { valid: false, reason: 'disabled' };

  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) {
    return { valid: false, reason: 'not_started' };
  }
  if (promo.endsAt && now > promo.endsAt) {
    return { valid: false, reason: 'expired' };
  }
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
    return { valid: false, reason: 'exhausted' };
  }
  if (promo.minSubtotal != null && input.subtotalCents < promo.minSubtotal) {
    return { valid: false, reason: 'min_subtotal' };
  }

  if (input.userId) {
    if (promo.firstOrderOnly) {
      // Cancelled orders don't count as a prior order, matching the
      // per-customer branch below. A paid-then-cancelled first order used to
      // block first-order codes permanently, even though its promo seat had
      // already gone back to the pool.
      const paidCount = await Order.countDocuments({
        user: input.userId,
        isPaid: true,
        orderStatus: { $ne: 'Cancelled' },
      });
      if (paidCount > 0) return { valid: false, reason: 'first_order_only' };
    }
    if (promo.perCustomerLimit != null && promo.perCustomerLimit > 0) {
      // Only paid, non-cancelled orders consume a seat. Cancelled orders
      // return the customer's seat (mirrors the refund-decrement rule),
      // and an unpaid pending order — possible once Stripe lands — should
      // never block the customer from re-trying the code on a fresh
      // attempt. Matches the isPaid gate the firstOrderOnly branch uses.
      const usedCount = await Order.countDocuments({
        user: input.userId,
        promoId: promo._id,
        isPaid: true,
        orderStatus: { $ne: 'Cancelled' },
      });
      if (usedCount >= promo.perCustomerLimit) {
        return { valid: false, reason: 'customer_limit' };
      }
    }
  }

  const memberApplied = Boolean(input.isMember) && !promo.excludesMember;
  const postMemberSubtotalCents = memberApplied
    ? Math.round(input.subtotalCents * (1 - MEMBER_DISCOUNT_RATE))
    : input.subtotalCents;

  let discountCents: number;
  if (promo.type === 'percent') {
    discountCents = Math.round(postMemberSubtotalCents * (promo.value / 100));
    if (promo.maxDiscount != null) {
      discountCents = Math.min(discountCents, promo.maxDiscount);
    }
  } else {
    discountCents = Math.min(promo.value, postMemberSubtotalCents);
  }

  return { valid: true, discountCents, promo };
}
