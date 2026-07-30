// Fields on `Order.paymentResult` that only an admin should ever see.
//
// They aren't rendered by the customer receipt or the profile order list, and
// a raw checkoutSessionId / paymentIntentId makes abuse easier (support-channel
// impersonation, brute-force probing). `settlementError` is a verbatim Stripe
// message written for admin refund triage.
//
// This lived inline in the single-order GET, which meant the list GET returned
// the very fields its sibling was careful to remove — the hardening was
// bypassable by asking for the collection instead of the item. Shared so a
// third customer-facing order read can't reintroduce the same gap.
const ADMIN_ONLY_PAYMENT_FIELDS = [
  'checkoutSessionId',
  'paymentIntentId',
  'settlementPaymentIntents',
  'settlementError',
] as const;

// Minimal structural shape — anything with an optional payment envelope.
type WithPaymentResult = {
  paymentResult?: Record<string, unknown> | null;
};

// A hydrated Mongoose document ignores `delete` on a subdocument path, so
// redacting one would return it apparently stripped and still serialize every
// field — this helper failing open, which is the one way it must never fail.
// Callers pass plain objects today (`.lean()` / `.toObject()`); normalising
// here means a future caller that forgets is corrected rather than silently
// leaking. `toObject` is the marker every hydrated document carries.
function toPlainOrder<T extends WithPaymentResult>(order: T): T {
  const maybeDoc = order as { toObject?: () => T };
  return typeof maybeDoc.toObject === 'function' ? maybeDoc.toObject() : order;
}

// Strips the admin-only payment identifiers and returns the redacted object,
// so callers can use it inline in a `NextResponse.json(...)`. Plain inputs are
// mutated in place; a hydrated document is converted first, so always use the
// return value rather than assuming the argument was modified.
export function redactOrderForCustomer<T extends WithPaymentResult>(order: T): T {
  const plain = toPlainOrder(order);
  if (plain.paymentResult) {
    for (const field of ADMIN_ONLY_PAYMENT_FIELDS) {
      delete plain.paymentResult[field];
    }
  }
  return plain;
}

export function redactOrdersForCustomer<T extends WithPaymentResult>(orders: T[]): T[] {
  return orders.map(redactOrderForCustomer);
}
