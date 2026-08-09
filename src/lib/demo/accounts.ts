import type { Types } from 'mongoose';

// ── Who the demo accounts are, in one place ─────────────────────────────
// `reset.ts`, `verify.ts` and `dry-run.ts` each looked the two demo accounts up
// with their own inline `{ isDemo: true, demoType: … }` literals and each built
// their own owner list. That is a domain rule — "what counts as demo-owned
// data" — written three times.
//
// It matters more than ordinary duplication because of which half gets
// forgotten. The ADMIN account owns storefront rows too: the catalog, cart,
// checkout, reviews and messages are open to any signed-in session, and the
// no-charge checkout tile enables itself for any `isDemo` user. Scoping to the
// customer alone is a bug this subsystem has already shipped once, leaving
// orders that counted in every revenue figure and reviews sitting on the public
// catalog. A fourth surface writing the lookup by hand is one `demoType`
// literal away from reopening it.
//
// Deliberately NOT a shared loader. The three call sites need genuinely
// different projections — `_id stripeCustomerId` hydrated, `_id savedCuts`
// lean, `_id` lean — and a projection-parameterised helper would trade one
// duplication for a weaker abstraction. `src/lib/demo/exclude.ts` is a fourth
// reader and stays separate for a different reason: it caches its answer at
// module scope, which is right for analytics and wrong for a reset.

export const DEMO_CUSTOMER_FILTER = { isDemo: true, demoType: 'customer' } as const;
export const DEMO_ADMIN_FILTER = { isDemo: true, demoType: 'admin' } as const;

/**
 * The owner ids a demo wipe is scoped to.
 *
 * Built defensively rather than assuming both accounts exist: the admin
 * post-dates some installs, so an older seeded database has only the customer.
 */
export function demoOwnerIds(
  customer: { _id: Types.ObjectId } | null | undefined,
  admin: { _id: Types.ObjectId } | null | undefined,
): Types.ObjectId[] {
  return [customer?._id, admin?._id].filter(
    (id): id is Types.ObjectId => id != null,
  );
}
