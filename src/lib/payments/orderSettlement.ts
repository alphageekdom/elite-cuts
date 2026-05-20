import 'server-only';

import OrderModel, { type Order, type OrderDocument } from '@/models/Order';
import { dollarsToCents, getStripe, isStubMode } from '@/lib/payments/stripe';
import {
  allVariableWeightLinesWeighed,
  realizedOrderTotal,
} from '@/lib/order-line';
import { DELIVERY_FEE } from '@/lib/pricing';

// Phase 4 — auto-settle at pickup. When an admin marks an order `Completed`
// AND it opted in to auto-settle at checkout AND every variable-weight
// line has been weighed, settlement computes the realized-vs-estimate
// delta and either:
//   - off-session captures the difference on the customer's saved card
//     when realized > estimate (`kind: 'capture'`)
//   - issues a partial refund against the original PaymentIntent when
//     realized < estimate (`kind: 'auto_refund'`)
//   - no-ops with `settled` and no transaction when |delta| < $0.01
//
// Failures (card declined, missing PaymentIntent, exceeded ceiling) mark
// the order `settlementStatus: 'failed'` and the admin gets a notification
// so they can settle in-store. Failures NEVER block fulfillment — points,
// stock, and the order's terminal state are unaffected.

export type SettlementResult =
  | { status: 'settled'; kind: 'capture' | 'auto_refund' | 'no_op'; amount: number; transactionId?: string }
  | { status: 'failed'; error: string }
  | { status: 'skipped'; reason: SettlementSkipReason };

export type SettlementSkipReason =
  | 'not_opted_in'
  | 'guest_order'
  | 'incomplete_weighing'
  | 'already_settled'
  | 'demo_payment_method';

// Caller-side check before we commit to running settlement. Same gates the
// settlement helper applies internally — exposed so callers (the PATCH
// handler) can short-circuit without burning a DB write on an obvious skip.
export function shouldRunSettlement(order: Pick<
  Order,
  'autoSettleAtPickup' | 'user' | 'orderItems' | 'paymentResult' | 'paymentMethod'
>): { ok: true } | { ok: false; reason: SettlementSkipReason } {
  if (!order.autoSettleAtPickup) return { ok: false, reason: 'not_opted_in' };
  if (!order.user) return { ok: false, reason: 'guest_order' };
  if (order.paymentMethod !== 'Stripe') return { ok: false, reason: 'demo_payment_method' };
  if (!allVariableWeightLinesWeighed(order.orderItems)) {
    return { ok: false, reason: 'incomplete_weighing' };
  }
  if (order.paymentResult?.settlementStatus === 'settled') {
    return { ok: false, reason: 'already_settled' };
  }
  return { ok: true };
}

// Cap the settlement amount on a per-line basis. Phase 3's data model
// stores ONE combined `realizedWeightLb` for all qty cuts on the line
// (see Phase 3 history), so the line's true consent ceiling is
// `qty × maxWeightLb`. A qty=2 line of 1.25-lb-max ribeyes weighed at
// 2.4 lb total is fine; 2.6 lb total is over the consent cap and falls
// out for the admin to settle in-store.
function exceedsConsentCeiling(order: Pick<Order, 'orderItems'>): boolean {
  return order.orderItems.some((line) => {
    if (line.pricingType !== 'per_lb' && line.pricingType !== 'whole_item_by_weight') {
      return false;
    }
    if (typeof line.realizedWeightLb !== 'number' || typeof line.maxWeightLb !== 'number') {
      return false;
    }
    return line.realizedWeightLb > line.maxWeightLb * line.qty;
  });
}

// Compute the realized-vs-estimate delta in dollars (positive = customer
// owes more, negative = customer owed back). Tax + delivery fee are
// included so the diff matches what Stripe should move.
function computeSettlementDelta(order: Pick<
  Order,
  'orderItems' | 'subtotal' | 'tax' | 'totalCost' | 'memberDiscount' | 'promoDiscount' | 'pointsRedemptionValueCents' | 'fulfillmentType'
>): number {
  const realizedTotal = realizedOrderTotal({
    lines: order.orderItems,
    subtotal: order.subtotal,
    tax: order.tax,
    memberDiscount: order.memberDiscount,
    promoDiscount: order.promoDiscount,
    pointsRedemptionValueCents: order.pointsRedemptionValueCents,
    deliveryFee: order.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0,
  });
  return Math.round((realizedTotal - order.totalCost) * 100) / 100;
}

// Main entry point. Atomically loads the order, applies the settlement
// step, and persists the result. Called from the PATCH /api/orders/[id]
// handler immediately after `awardOrderCompletion` on the first-time
// transition into `Completed`. Returns a structured result so the
// caller can fire admin notifications on failure without inspecting
// thrown errors.
//
// Stub mode (no STRIPE_SECRET_KEY) treats the settlement as instantly
// successful with a fake transaction id, so the portfolio demo can be
// driven end-to-end without sandbox credentials.
export async function runOrderSettlement(orderId: string): Promise<SettlementResult> {
  const order = await OrderModel.findById(orderId);
  if (!order) return { status: 'failed', error: 'Order not found' };

  const gate = shouldRunSettlement(order);
  if (!gate.ok) return { status: 'skipped', reason: gate.reason };

  if (exceedsConsentCeiling(order)) {
    await markSettlementFailed(order, 'Realized weight exceeds the customer\'s consent ceiling (max weight). Settle in-store.');
    return { status: 'failed', error: 'Exceeds consent ceiling' };
  }

  const deltaDollars = computeSettlementDelta(order);
  const deltaCents = dollarsToCents(Math.abs(deltaDollars));

  // No-op branch — realized matches estimate within a cent.
  if (deltaCents === 0) {
    order.paymentResult.settlementStatus = 'settled';
    order.paymentResult.settlementError = undefined;
    await order.save();
    return { status: 'settled', kind: 'no_op', amount: 0 };
  }

  // Stub mode short-circuit — fake the settlement so the demo flow works
  // without sandbox credentials. Generates a deterministic stub id so
  // tests/replays don't surprise the audit trail with random values.
  if (isStubMode()) {
    const stubId = `stub_settlement_${String(order._id)}_${Date.now()}`;
    return await applySettlementSuccess(
      order,
      deltaDollars > 0 ? 'capture' : 'auto_refund',
      Math.abs(deltaDollars),
      stubId,
    );
  }

  // Real Stripe path. Resolve the payment method from the original
  // PaymentIntent — that's the card Stripe actually charged at checkout,
  // whether it was typed in fresh, picked from the saved-cards strip,
  // or attached via setup_future_usage.
  if (!order.paymentResult.paymentIntentId) {
    await markSettlementFailed(order, 'No PaymentIntent on file — original payment cannot be located.');
    return { status: 'failed', error: 'Missing PaymentIntent' };
  }

  try {
    const stripe = getStripe();

    if (deltaDollars > 0) {
      // Realized > estimate → off-session capture for the difference.
      const original = await stripe.paymentIntents.retrieve(
        order.paymentResult.paymentIntentId,
      );
      const paymentMethodId =
        typeof original.payment_method === 'string'
          ? original.payment_method
          : original.payment_method?.id;
      const customerId =
        typeof original.customer === 'string'
          ? original.customer
          : original.customer?.id;
      if (!paymentMethodId || !customerId) {
        await markSettlementFailed(order, 'Original payment is not tied to a saved card.');
        return { status: 'failed', error: 'No saved payment method' };
      }

      const settlement = await stripe.paymentIntents.create({
        amount: deltaCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          orderId: String(order._id),
          settlementKind: 'capture',
        },
      });

      return await applySettlementSuccess(
        order,
        'capture',
        deltaCents / 100,
        settlement.id,
      );
    }

    // Realized < estimate → partial refund against the original intent.
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentResult.paymentIntentId,
      amount: deltaCents,
      metadata: {
        orderId: String(order._id),
        settlementKind: 'auto_refund',
      },
    });

    return await applySettlementSuccess(
      order,
      'auto_refund',
      deltaCents / 100,
      refund.id,
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Stripe settlement call failed — settle in-store.';
    await markSettlementFailed(order, message);
    return { status: 'failed', error: message };
  }
}

async function applySettlementSuccess(
  order: OrderDocument,
  kind: 'capture' | 'auto_refund',
  amount: number,
  transactionId: string,
): Promise<SettlementResult> {
  const transactions = order.paymentResult.settlementPaymentIntents ?? [];
  transactions.push({ id: transactionId, amount, kind, createdAt: new Date() });
  order.paymentResult.settlementPaymentIntents = transactions;
  order.paymentResult.settlementStatus = 'settled';
  order.paymentResult.settlementError = undefined;
  await order.save();
  return { status: 'settled', kind, amount, transactionId };
}

async function markSettlementFailed(
  order: OrderDocument,
  message: string,
): Promise<void> {
  order.paymentResult.settlementStatus = 'failed';
  order.paymentResult.settlementError = message;
  await order.save();
}

// Initial state-flip when the order is placed. Setting the status to
// `'pending'` distinguishes "opted in but not yet weighed" from "didn't
// opt in" — the admin drawer reads that to decide whether to render the
// settlement chip while the order is in flight.
export function initialSettlementStatus(order: Pick<Order, 'autoSettleAtPickup' | 'user' | 'paymentMethod'>): 'pending' | undefined {
  if (!order.autoSettleAtPickup) return undefined;
  if (!order.user) return undefined;
  if (order.paymentMethod !== 'Stripe') return undefined;
  return 'pending';
}
