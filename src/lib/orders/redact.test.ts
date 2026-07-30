import { describe, expect, it } from 'vitest';

import { redactOrderForCustomer, redactOrdersForCustomer } from './redact';

// The single-order GET stripped these four fields for a customer reading their
// own order; the list GET returned them untouched, so asking for the collection
// was a way around the strip. Both routes now share this helper — these tests
// exist so a third customer-facing order read can't quietly reopen the gap.

const paidOrder = () => ({
  _id: 'order-1',
  totalCost: 42,
  paymentResult: {
    status: 'Completed',
    provider: 'stripe',
    amountPaid: 42,
    currency: 'USD',
    checkoutSessionId: 'cs_test_abc123',
    paymentIntentId: 'pi_test_abc123',
    settlementPaymentIntents: [{ id: 'pi_settle_1', amount: 3, kind: 'capture' }],
    settlementError: 'Your card was declined.',
  } as Record<string, unknown>,
});

describe('redactOrderForCustomer', () => {
  it('removes every admin-only Stripe identifier', () => {
    const out = redactOrderForCustomer(paidOrder());

    expect(out.paymentResult).not.toHaveProperty('checkoutSessionId');
    expect(out.paymentResult).not.toHaveProperty('paymentIntentId');
    expect(out.paymentResult).not.toHaveProperty('settlementPaymentIntents');
    // A verbatim Stripe decline message is written for admin refund triage.
    expect(out.paymentResult).not.toHaveProperty('settlementError');
  });

  it('leaves the fields the customer receipt actually renders', () => {
    const out = redactOrderForCustomer(paidOrder());

    expect(out.paymentResult).toMatchObject({
      status: 'Completed',
      provider: 'stripe',
      amountPaid: 42,
      currency: 'USD',
    });
    expect(out.totalCost).toBe(42);
  });

  it('tolerates an order with no payment envelope', () => {
    // Guest / demo orders can reach the list before a payment result exists.
    const missing = { _id: 'x', paymentResult: undefined };
    const nulled = { _id: 'x', paymentResult: null };
    expect(() => redactOrderForCustomer(missing)).not.toThrow();
    expect(() => redactOrderForCustomer(nulled)).not.toThrow();
    expect(redactOrderForCustomer(nulled)._id).toBe('x');
  });

  it('redacts a hydrated document by converting it first', () => {
    // Stand-in for a Mongoose doc: `delete` on the payment envelope silently
    // does nothing (a real subdocument ignores it), and `toObject()` yields the
    // plain copy. Without the conversion the helper would return this
    // apparently redacted while still carrying every identifier — failing open.
    const sealedEnvelope = Object.freeze({
      status: 'Completed',
      paymentIntentId: 'pi_test_leak',
      checkoutSessionId: 'cs_test_leak',
    }) as unknown as Record<string, unknown>;

    const hydrated = {
      _id: 'order-1',
      paymentResult: sealedEnvelope,
      toObject: () => ({
        _id: 'order-1',
        paymentResult: { ...sealedEnvelope },
      }),
    };

    const out = redactOrderForCustomer(hydrated);

    expect(out.paymentResult).not.toHaveProperty('paymentIntentId');
    expect(out.paymentResult).not.toHaveProperty('checkoutSessionId');
    expect(out.paymentResult).toMatchObject({ status: 'Completed' });
    // The original document is left alone — the caller must use the return.
    expect(hydrated.paymentResult).toHaveProperty('paymentIntentId');
  });

  it('redacts every order in a list', () => {
    const out = redactOrdersForCustomer([paidOrder(), paidOrder()]);

    expect(out).toHaveLength(2);
    for (const order of out) {
      expect(order.paymentResult).not.toHaveProperty('paymentIntentId');
      expect(order.paymentResult).not.toHaveProperty('checkoutSessionId');
    }
  });
});
