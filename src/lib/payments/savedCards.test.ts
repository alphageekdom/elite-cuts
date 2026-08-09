import { beforeEach, describe, expect, it, vi } from 'vitest';

// `savedCards.ts` is `server-only` and pulls in `connectDB`, two Mongoose
// models and the Stripe client. Mocked here for one narrow purpose: pinning
// `deleteStripeCustomer`, whose contract the account-deletion cascade depends
// on and cannot enforce itself.

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/models/SavedCard', () => ({ default: {} }));

const mocks = vi.hoisted(() => ({
  customersDel: vi.fn(),
  customersCreate: vi.fn(),
  isStubMode: vi.fn(),
  userFindById: vi.fn(),
  userFindOneAndUpdate: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    findById: mocks.userFindById,
    findOneAndUpdate: mocks.userFindOneAndUpdate,
  },
}));

vi.mock('@/lib/payments/stripe', () => ({
  getStripe: () => ({
    customers: { del: mocks.customersDel, create: mocks.customersCreate },
  }),
  isStubMode: mocks.isStubMode,
  dollarsToCents: (d: number) => Math.round(d * 100),
}));

const { deleteStripeCustomer, getOrCreateStripeCustomer } = await import(
  './savedCards'
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isStubMode.mockReturnValue(false);
  mocks.customersDel.mockResolvedValue({ deleted: true });
  mocks.customersCreate.mockResolvedValue({ id: 'cus_new' });
});

describe('deleteStripeCustomer', () => {
  it('deletes the Customer, which takes its payment methods with it', async () => {
    await deleteStripeCustomer('cus_abc');
    expect(mocks.customersDel).toHaveBeenCalledWith('cus_abc');
  });

  // The load-bearing one. `hardDeleteUser` calls this with NO try/catch,
  // deliberately — a customer who asked to be deleted is entitled to be deleted
  // whether or not a third party answers. If the internal catch is ever removed,
  // a Stripe outage would throw straight through the cascade and strand a
  // half-deleted account: orders anonymised, cart gone, User row still present.
  it('never throws when Stripe fails, so a cascade cannot be stranded', async () => {
    mocks.customersDel.mockRejectedValue(new Error('Stripe unreachable'));
    await expect(deleteStripeCustomer('cus_abc')).resolves.toBeUndefined();
  });

  it('logs the customer id on failure — the only remaining pointer to it', async () => {
    // The caller destroys `stripeCustomerId` moments later and the purge cron
    // skips users whose doc is gone, so there is no retry. This log line is the
    // sole means of ever finding the orphaned object again.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.customersDel.mockRejectedValue(new Error('Stripe unreachable'));

    await deleteStripeCustomer('cus_orphan_me');

    expect(spy.mock.calls[0][0]).toContain('cus_orphan_me');
    spy.mockRestore();
  });

  it('treats an already-deleted Customer as success, not as an orphan', async () => {
    // Reachable on a cron retry — the cascade can die between a successful
    // delete and `User.deleteOne`, and the retry re-reads a User doc still
    // carrying the id. Logging the orphan warning here would send an operator
    // hunting for an object Stripe removed on the first pass.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.customersDel.mockRejectedValue(
      Object.assign(new Error('No such customer'), {
        code: 'resource_missing',
      }),
    );

    await deleteStripeCustomer('cus_already_gone');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('no-ops in stub mode even when an id is present', async () => {
    // Stub deploys mint no Customers, but a database restored from a real-mode
    // dump can carry ids — so "has an id" must not be enough to reach Stripe,
    // which throws at construction when no key is configured.
    mocks.isStubMode.mockReturnValue(true);
    await deleteStripeCustomer('cus_from_a_real_dump');
    expect(mocks.customersDel).not.toHaveBeenCalled();
  });

  it('no-ops for a customer who never reached Stripe', async () => {
    for (const id of [null, undefined, '']) {
      await deleteStripeCustomer(id);
    }
    expect(mocks.customersDel).not.toHaveBeenCalled();
  });
});

// ── Demo accounts never get a Stripe Customer ──────────────────────────
// Two demo accounts are shared by every visitor for the life of the deploy, so
// a Customer created for one is never replaced and every card any visitor
// saves against it attaches permanently. The nightly reset clears the local
// SavedCard mirror and used to leave the Stripe side untouched.
describe('getOrCreateStripeCustomer — demo accounts', () => {
  // The real call chains `.select(...)` off `findById`, and this stub HONOURS
  // the projection rather than handing back a complete fixture.
  //
  // That is the whole reason the behavioural tests below are load-bearing.
  // `select('name email stripeCustomerId')` is an inclusive projection, so
  // dropping `isDemo` from it leaves `user.isDemo === undefined` and the guard
  // never fires — demo accounts silently resume minting Stripe Customers. With
  // a projection-blind stub the fixture supplied `isDemo: true` regardless and
  // every test here passed straight through that regression.
  const selectChain = (result: unknown) => ({
    select: (fields?: string) => {
      if (!fields || result === null || typeof result !== 'object') {
        return Promise.resolve(result);
      }
      const keep = new Set([...fields.split(/\s+/).filter(Boolean), '_id']);
      return Promise.resolve(
        Object.fromEntries(
          Object.entries(result as Record<string, unknown>).filter(([k]) =>
            keep.has(k),
          ),
        ),
      );
    },
  });

  it('returns null for a demo account and creates nothing at Stripe', async () => {
    mocks.userFindById.mockReturnValue(
      selectChain({ _id: 'demo-1', email: 'demo@x.test', name: 'Demo', isDemo: true }),
    );

    await expect(getOrCreateStripeCustomer('demo-1')).resolves.toBeNull();
    expect(mocks.customersCreate).not.toHaveBeenCalled();
    expect(mocks.userFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns null even when a Customer id is already persisted', async () => {
    // One rule ("demo sessions have no Stripe Customer") rather than two. An
    // id left over from before this guard must not pick up new cards while the
    // reset is getting round to deleting it.
    mocks.userFindById.mockReturnValue(
      selectChain({
        _id: 'demo-1',
        email: 'demo@x.test',
        name: 'Demo',
        isDemo: true,
        stripeCustomerId: 'cus_legacy',
      }),
    );

    await expect(getOrCreateStripeCustomer('demo-1')).resolves.toBeNull();
    expect(mocks.customersCreate).not.toHaveBeenCalled();
  });

  it('still creates and persists one for a real customer', async () => {
    // The guard has to be narrow. A version that returned null for everyone
    // would pass both tests above and silently stop every real shopper's card
    // from being saved.
    mocks.userFindById.mockReturnValue(
      selectChain({ _id: 'real-1', email: 'real@x.test', name: 'Real', isDemo: false }),
    );
    mocks.userFindOneAndUpdate.mockReturnValue(
      selectChain({ stripeCustomerId: 'cus_new' }),
    );

    await expect(getOrCreateStripeCustomer('real-1')).resolves.toBe('cus_new');
    expect(mocks.customersCreate).toHaveBeenCalledOnce();
  });

  // There was a test here asserting the projection STRING contained `isDemo`.
  // It is gone, and deliberately so rather than by oversight.
  //
  // It existed because the stub above used to ignore projections, which left
  // the string as the only thing catching a silent, security-relevant
  // regression. Now that the stub honours the projection, the two behavioural
  // tests above fail on exactly that change — verified by removing `isDemo`
  // from the projection and watching both go red. Asserting the string as well
  // buys nothing and costs something: it would false-fail if the projection
  // ever moved to object form (`.select({ isDemo: 1 })`), reporting a break
  // where none exists.
});
