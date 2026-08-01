import type {
  OrderItem,
  PaymentStatus,
  SettlementTransaction,
} from '@/models/Order';
import { realizedLineTotal } from '@/lib/orders/line';
import { roundMoney as round2 } from '@/lib/money';

// What the shop has actually collected for this order, net of settlement.
//
// The Stripe charge at checkout is `totalCost` — the estimate. Phase 4's
// auto-settle then moves the realized-vs-estimate difference on a SEPARATE
// PaymentIntent (`capture`) or as a partial refund against the original
// (`auto_refund`). So on a settled order `totalCost` is no longer what the
// customer paid, and using it as the refund ceiling goes wrong in both
// directions: a captured order refunds short by the captured delta, and an
// auto-refunded one asks Stripe for more than the intent has left, which
// Stripe rejects and the admin sees as an unexplained failure.
export function netCollected(
  totalCost: number,
  settlements: SettlementTransaction[] | undefined,
): number {
  const net = (settlements ?? []).reduce(
    (sum, t) => sum + (t.kind === 'capture' ? t.amount : -t.amount),
    totalCost,
  );
  return Math.max(0, round2(net));
}

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
  // Readonly — the helper only ever reads, and callers hold their lines as
  // readonly arrays.
  items: readonly Pick<
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

// One Stripe refund to issue: which PaymentIntent, and for how much.
export type RefundAllocation = { paymentIntentId: string; amount: number };

// Spread an amount owed across the intents that actually hold the money.
//
// A settled order's funds can sit on more than one PaymentIntent: the
// original checkout charge, plus one `capture` intent per settlement that
// charged the customer more at pickup. Refunding only the original strands
// the captured difference — Stripe cannot refund an intent for money it
// never took.
//
// Sources are drawn down in order (original first, then captures oldest
// first), with `alreadyRefunded` consumed off the front so a second partial
// refund picks up where the first left off. That ordering is what makes the
// allocation reproducible from stored state alone — the order tracks refunds
// in aggregate, not per intent.
export function allocateRefund({
  paymentIntentId,
  totalCost,
  settlements,
  alreadyRefunded,
  amount,
}: {
  paymentIntentId: string;
  totalCost: number;
  settlements: SettlementTransaction[] | undefined;
  alreadyRefunded: number;
  amount: number;
}): RefundAllocation[] {
  const transactions = settlements ?? [];
  const autoRefunded = transactions
    .filter((t) => t.kind === 'auto_refund')
    .reduce((sum, t) => sum + t.amount, 0);

  // The original intent can only give back what it still holds after any
  // auto-refund settlement already clawed some of it back.
  const sources: RefundAllocation[] = [
    {
      paymentIntentId,
      amount: Math.max(0, round2(totalCost - autoRefunded)),
    },
    ...transactions
      .filter((t) => t.kind === 'capture')
      .map((t) => ({ paymentIntentId: t.id, amount: round2(t.amount) })),
  ];

  let toSkip = Math.max(0, round2(alreadyRefunded));
  let remaining = Math.max(0, round2(amount));
  const allocations: RefundAllocation[] = [];

  for (const source of sources) {
    if (remaining <= 0) break;
    let capacity = source.amount;
    if (toSkip > 0) {
      const consumed = Math.min(toSkip, capacity);
      toSkip = round2(toSkip - consumed);
      capacity = round2(capacity - consumed);
    }
    if (capacity <= 0) continue;
    const take = round2(Math.min(capacity, remaining));
    allocations.push({ paymentIntentId: source.paymentIntentId, amount: take });
    remaining = round2(remaining - take);
  }

  return allocations;
}
