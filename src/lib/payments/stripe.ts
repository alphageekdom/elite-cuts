import 'server-only';

import Stripe from 'stripe';

declare global {
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

  // Pin the API version explicitly so an SDK upgrade can't silently change
  // the contract of `refunds.create` or `checkout.sessions.create`. Stripe's
  // SDK exposes its own pinned version as a runtime constant; using that
  // beats hardcoding a date string and keeps the SDK + API in lockstep.
  globalThis.stripeClient = new Stripe(key, {
    apiVersion: Stripe.API_VERSION,
    typescript: true,
  });
  return globalThis.stripeClient;
};

// Stripe wants integer cents; internal totals are stored as dollar floats. The
// round-then-cast guards against floating-point drift on values like 19.99 * 1.
export const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * 100);
