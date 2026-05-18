import 'server-only';

import Stripe from 'stripe';

import type { OrderItem } from '@/models/Order';

declare global {
  // eslint-disable-next-line no-var -- `var` is required syntactically inside `declare global`.
  var stripeClient: Stripe | undefined;
}

// True when no STRIPE_SECRET_KEY is set in the environment. Callers that touch
// Stripe (route handlers, webhook handlers, refund branches) should branch on
// this and substitute a local mock flow instead of hitting the real API. Lets
// the project ship in environments without Stripe credentials — useful for
// portfolio demos where sandbox keys live on a different project. When a key
// is eventually set, the stub disengages with no code change required.
export const isStubMode = (): boolean => !process.env.STRIPE_SECRET_KEY;

// Lazy-throws so the module can be imported by code paths that don't actually
// hit Stripe (e.g. type-only imports). The error surfaces at first real use.
export const getStripe = (): Stripe => {
  if (globalThis.stripeClient) {
    return globalThis.stripeClient;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  globalThis.stripeClient = new Stripe(key, {
    typescript: true,
  });
  return globalThis.stripeClient;
};

// Stripe wants integer cents; internal totals are stored as dollar floats. The
// round-then-cast guards against floating-point drift on values like 19.99 * 1.
export const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * 100);

export type StripeLineItem = NonNullable<
  Stripe.Checkout.SessionCreateParams['line_items']
>[number];

// Maps an order's line items to Stripe Checkout Session line_items using
// inline `price_data` — no need to pre-create Stripe Product / Price objects.
// Images are included only when they look like a public URL; bare filenames
// would 404 on Stripe's hosted page.
export const cartToLineItems = (items: OrderItem[]): StripeLineItem[] =>
  items.map((item) => ({
    quantity: item.qty,
    price_data: {
      currency: 'usd',
      unit_amount: dollarsToCents(item.price),
      product_data: {
        name: item.name,
        ...(/^https?:\/\//.test(item.image) ? { images: [item.image] } : {}),
      },
    },
  }));
