import type { PaymentResult } from '@/models/Order';

/**
 * The payment envelope a counter sale is created with.
 *
 * `POST /api/orders` built this inline, and the walk-in half of
 * `hasSettledPayment` is the only thing standing between a cancelled counter
 * sale and silently losing the stock its creation took. Nothing coupled the
 * two: deleting `provider: 'admin'` from the route's literal left the whole
 * suite green — the schema default put `'demo'` back, every walk-in read as an
 * unpaid checkout order, and typecheck had nothing to complain about because
 * the field is optional on the create payload.
 *
 * Extracted so the route and the test read the same source, and a regression
 * fails rather than passing quietly.
 */
export function walkInPaymentResult({
  isCompletedNow,
  totalCost,
  now,
}: {
  /** Admin recorded the pickup as already collected. */
  isCompletedNow: boolean;
  totalCost: number;
  now: Date;
}): Pick<
  PaymentResult,
  'status' | 'provider' | 'amountPaid' | 'currency' | 'paymentDate'
> {
  return {
    status: isCompletedNow ? 'Completed' : 'Pending',
    // Stated, never defaulted — the schema's default ('demo') is
    // indistinguishable from the demo-card checkout path.
    provider: 'admin',
    amountPaid: isCompletedNow ? totalCost : 0,
    currency: 'USD',
    paymentDate: now,
  };
}
