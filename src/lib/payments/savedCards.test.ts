import { beforeEach, describe, expect, it, vi } from 'vitest';

// `savedCards.ts` is `server-only` and pulls in `connectDB`, two Mongoose
// models and the Stripe client. Mocked here for one narrow purpose: pinning
// `deleteStripeCustomer`, whose contract the account-deletion cascade depends
// on and cannot enforce itself.

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/models/SavedCard', () => ({ default: {} }));
vi.mock('@/models/User', () => ({ default: {} }));

const mocks = vi.hoisted(() => ({
  customersDel: vi.fn(),
  isStubMode: vi.fn(),
}));

vi.mock('@/lib/payments/stripe', () => ({
  getStripe: () => ({ customers: { del: mocks.customersDel } }),
  isStubMode: mocks.isStubMode,
  dollarsToCents: (d: number) => Math.round(d * 100),
}));

const { deleteStripeCustomer } = await import('./savedCards');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isStubMode.mockReturnValue(false);
  mocks.customersDel.mockResolvedValue({ deleted: true });
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
