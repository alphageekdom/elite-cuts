import { describe, expect, it } from 'vitest';

import OrderModel from '@/models/Order';
import { hasSettledPayment } from './payment-state';
import { walkInPaymentResult } from './walk-in';

// The bug this guards: cancelling a checkout order that never got past
// Pending used to restock stock that was never decremented, hand back points
// the customer never spent, and release a promo seat that was never taken —
// because every one of those side effects lives in `completeSessionForOrder`,
// not at order creation. Stub mode has no session expiry, so abandoned demo
// checkouts sit in exactly that state and cleaning them up is routine.
//
// Fixtures are built THROUGH the real model rather than as bare object
// literals. An earlier version hand-wrote the walk-in case as
// `{ paymentResult: { status } }`, matching a belief that the walk-in route
// sent no `provider`. It sent none at the time, but the schema defaults one in,
// so the fixture described a document the application could not produce: the
// suite stayed green while every walk-in order was misclassified in production.
// The route now states `provider: 'admin'` outright, via `walkInPaymentResult`.
//
// `new OrderModel(...)` applies the same defaults Mongoose applies on a real
// write (no connection needed), so a schema default can never quietly diverge
// from a fixture again.

/** `paymentResult` as it lands in the DB for a given creation payload. */
const stored = (paymentResult: Record<string, unknown>) =>
  new OrderModel({ paymentResult }).paymentResult;

// Built from the SAME helper the walk-in route uses, not a copy of its shape.
// A hand-written fixture cannot catch the route drifting away from it, which
// is exactly how the original bug survived a green suite.
const walkIn = (isCompletedNow: boolean) =>
  ({
    paymentResult: stored(
      walkInPaymentResult({ isCompletedNow, totalCost: 42, now: new Date() }),
    ),
  }) as never;

// Exactly what `POST /api/checkout/session` sends: 'stripe' for the hosted
// and stub paths, 'demo' for the no-charge card tile.
const checkout = (status: string) =>
  ({
    paymentResult: stored({
      status,
      provider: 'stripe',
      amountPaid: 0,
      currency: 'USD',
      paymentDate: new Date(),
    }),
  }) as never;

// A pre-`'admin'` walk-in: the schema default filled in 'demo', and a counter
// sale never acquires a checkout session id.
const legacyWalkIn = (status: string) =>
  ({
    paymentResult: stored({
      status,
      provider: 'demo',
      amountPaid: 0,
      currency: 'USD',
      paymentDate: new Date(),
    }),
  }) as never;

// A hosted or stub checkout: 'stripe' plus the session id both paths stamp.
const stubCheckout = (status: string) =>
  ({
    paymentResult: stored({
      status,
      provider: 'stripe',
      checkoutSessionId: 'cs_test_stub_abc123',
      amountPaid: 0,
      currency: 'USD',
      paymentDate: new Date(),
    }),
  }) as never;

describe('the walk-in envelope states its provider', () => {
  // A contract assertion on the helper the route calls, not on behaviour.
  // Behaviour alone cannot pin this: the legacy clause in `hasSettledPayment`
  // also answers "settled" for a `'demo'` row with no session id, so dropping
  // the marker leaves every outcome unchanged. That redundancy is deliberate —
  // it is what protects orders written before the marker existed — but it means
  // the marker itself needs pinning here or nothing would notice its loss.
  it('does not leave the provider to the schema default', () => {
    const envelope = walkInPaymentResult({
      isCompletedNow: false,
      totalCost: 42,
      now: new Date(),
    });
    expect(envelope.provider).toBe('admin');
    expect(stored(envelope).provider).toBe('admin');
  });

  it('shows the default that made an absence test unusable', () => {
    // Omitting `provider` yields 'demo', indistinguishable from the demo-card
    // checkout path — which is why the discriminator must be stated, not inferred.
    expect(stored({ status: 'Pending' }).provider).toBe('demo');
  });

  it('records the collected amount only when the pickup already happened', () => {
    const now = new Date();
    expect(walkInPaymentResult({ isCompletedNow: true, totalCost: 42, now })).toMatchObject({
      status: 'Completed',
      amountPaid: 42,
    });
    expect(walkInPaymentResult({ isCompletedNow: false, totalCost: 42, now })).toMatchObject({
      status: 'Pending',
      amountPaid: 0,
    });
  });
});

describe('hasSettledPayment', () => {
  it('treats a never-paid checkout order as unsettled', () => {
    expect(hasSettledPayment(checkout('Pending'))).toBe(false);
    // The abandoned stub-mode checkouts that accumulate (no session expiry)
    // and are the natural thing for an admin to clean up.
    expect(hasSettledPayment(stubCheckout('Pending'))).toBe(false);
  });

  it('treats a pre-marker walk-in as settled despite its default provider', () => {
    // Written before `'admin'` existed, so the schema default put 'demo' on it.
    // Routing these to the unsettled branch refused their completion outright
    // and skipped the restock for stock that creation had already taken. The
    // absent checkout session id is what separates them from a real checkout —
    // both hosted and stub flows stamp one.
    expect(hasSettledPayment(legacyWalkIn('Pending'))).toBe(true);
    expect(hasSettledPayment(legacyWalkIn('Failed'))).toBe(true);
  });

  it('treats an expired checkout order as unsettled', () => {
    // The webhook's session-expiry path flips Pending → Failed without ever
    // running the completion sequence.
    expect(hasSettledPayment(checkout('Failed'))).toBe(false);
  });

  it('treats a paid checkout order as settled', () => {
    expect(hasSettledPayment(checkout('Completed'))).toBe(true);
    expect(hasSettledPayment(checkout('Partially Refunded'))).toBe(true);
    expect(hasSettledPayment(checkout('Refunded'))).toBe(true);
  });

  it('treats Authorized as settled', () => {
    // The stock decrement runs immediately after the atomic Pending →
    // Authorized claim, so a crash in that window leaves stock already taken.
    // Under-reversing is the safer failure here.
    expect(hasSettledPayment(checkout('Authorized'))).toBe(true);
  });

  it('treats every admin walk-in order as settled regardless of status', () => {
    // Walk-ins decrement stock at creation, so a Pending one still has value
    // applied: the admin must be able to complete it, and cancelling it
    // genuinely does need to restock. Getting this wrong blocked completion
    // outright and lost the stock silently on cancel.
    expect(hasSettledPayment(walkIn(false))).toBe(true);
    expect(hasSettledPayment(walkIn(true))).toBe(true);
  });

  it('does not throw on an order with no payment envelope', () => {
    expect(hasSettledPayment({ paymentResult: undefined } as never)).toBe(true);
  });
});
