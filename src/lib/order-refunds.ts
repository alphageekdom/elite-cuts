import type { OrderItem, PaymentStatus } from '@/models/Order';
import { realizedLineTotal } from '@/lib/order-line';
import { roundMoney as round2 } from '@/lib/money';

export type RefundSummary = {
  /** Sum of refunded line totals (realized when weighed, else estimate). */
  refundedSubtotal: number;
  /** Share of the original order tax attributable to the refunded subtotal. */
  refundedTax: number;
  /** refundedSubtotal + refundedTax — the amount the customer is owed back. */
  refundedAmount: number;
  refundedCount: number;
  totalCount: number;
};

export type RefundContext = {
  /** Pre-tax order subtotal (sum of every line, refunded or not). */
  subtotal: number;
  /** Original order tax. */
  tax: number;
  /**
   * Optional. The total the customer actually paid in dollars (after
   * member discount, promo, and points redemption, plus tax). When
   * provided, the resulting refundedAmount is capped at this value so a
   * heavily-discounted order can't appear to refund more than the shop
   * collected. Without it, the cap doesn't fire and behavior is unchanged
   * for callers that don't care.
   */
  totalCost?: number;
};

export function refundSummary(
  items: Pick<
    OrderItem,
    'qty' | 'price' | 'refunded' | 'pricingType' | 'pricePerLb' | 'realizedWeightLb'
  >[],
  context: RefundContext,
): RefundSummary {
  let refundedLines = 0;
  let refundedCount = 0;
  for (const item of items) {
    if (item.refunded) {
      // For variable-weight lines that were weighed at pickup, refund the
      // realized total — what the customer actually paid for that line —
      // rather than the at-checkout estimate. `realizedLineTotal` falls
      // back to `qty × price` for fixed lines and unfulfilled orders.
      refundedLines += realizedLineTotal(item);
      refundedCount += 1;
    }
  }
  const refundedSubtotal = round2(refundedLines);
  const refundedTax =
    context.subtotal > 0
      ? round2((refundedSubtotal / context.subtotal) * context.tax)
      : 0;
  const rawRefundedAmount = round2(refundedSubtotal + refundedTax);
  const refundedAmount =
    typeof context.totalCost === 'number'
      ? Math.min(rawRefundedAmount, round2(context.totalCost))
      : rawRefundedAmount;
  return {
    refundedSubtotal,
    refundedTax,
    refundedAmount,
    refundedCount,
    totalCount: items.length,
  };
}

export function paymentStatusFor(
  currentStatus: PaymentStatus,
  summary: RefundSummary,
): PaymentStatus {
  if (summary.refundedCount === 0) return currentStatus;
  if (summary.refundedCount >= summary.totalCount) return 'Refunded';
  return 'Partially Refunded';
}
