import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// `exclude.ts` pulls in `server-only`, `connectDB`, and the User model.
// None of that runs cleanly outside Next's bundler / a live DB. Mocks
// here exercise:
//   1. excludeDemoOrders — returns a `{ user: { $nin } }` fragment when demo
//      accounts exist, and `{}` when none do (no-op spread).
//   2. getDemoCustomerId / getDemoOwnerIds — the customer id, and both ids.
//   3. The per-process cache — a second call doesn't re-query the User
//      collection.
// The module re-imports between tests via `vi.resetModules()` so the
// cache state is per-test.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFind: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    find: mocks.userFind,
  },
}));

// Match the chained `.select(...).lean()` on the find result.
const findChain = (result: unknown) => ({
  select: () => ({
    lean: () => Promise.resolve(result),
  }),
});

const CUSTOMER = { _id: 'demo-customer-id', demoType: 'customer' };
const ADMIN = { _id: 'demo-admin-id', demoType: 'admin' };

beforeEach(() => {
  mocks.userFind.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('excludeDemoOrders — demo accounts exist', () => {
  // The exclusion covers BOTH demo accounts. The storefront is open to any
  // signed-in session and the no-charge checkout tile enables itself for any
  // `isDemo` user, so a visitor exploring the admin demo can place orders
  // too — and those used to count toward every revenue, AOV and repeat-rate
  // number a real admin reads.
  it('returns a `$nin` fragment covering both demo accounts', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER, ADMIN]));

    const { excludeDemoOrders } = await import('./exclude');
    const fragment = await excludeDemoOrders();

    expect(fragment).toEqual({ user: { $nin: [CUSTOMER._id, ADMIN._id] } });
  });

  it('looks up every demo account by the isDemo flag', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER]));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();

    expect(mocks.userFind).toHaveBeenCalledWith({ isDemo: true });
  });

  it('still works when only the customer account is seeded', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER]));

    const { excludeDemoOrders } = await import('./exclude');
    expect(await excludeDemoOrders()).toEqual({
      user: { $nin: [CUSTOMER._id] },
    });
  });
});

describe('excludeDemoOrders — no demo accounts', () => {
  it('returns an empty object so callers can safely spread it', async () => {
    mocks.userFind.mockReturnValue(findChain([]));

    const { excludeDemoOrders } = await import('./exclude');
    const fragment = await excludeDemoOrders();

    // A fresh DB where the demo seed hasn't run: the spread must not change
    // the caller's query.
    expect(fragment).toEqual({});
  });
});

describe('excludeDemoOrders — per-process cache', () => {
  it('only queries the User collection once even when called repeatedly', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER, ADMIN]));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();
    await excludeDemoOrders();
    await excludeDemoOrders();

    expect(mocks.userFind).toHaveBeenCalledOnce();
  });

  it('caches the empty result too so a fresh DB does not re-query', async () => {
    mocks.userFind.mockReturnValue(findChain([]));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();
    await excludeDemoOrders();

    expect(mocks.userFind).toHaveBeenCalledOnce();
  });
});

describe('getDemoCustomerId', () => {
  it('returns the customer id, not the admin one', async () => {
    mocks.userFind.mockReturnValue(findChain([ADMIN, CUSTOMER]));

    const { getDemoCustomerId } = await import('./exclude');
    expect(await getDemoCustomerId()).toBe(CUSTOMER._id);
  });

  it('returns null when no demo customer exists', async () => {
    mocks.userFind.mockReturnValue(findChain([ADMIN]));

    const { getDemoCustomerId } = await import('./exclude');
    expect(await getDemoCustomerId()).toBeNull();
  });

  it('shares the same cache as excludeDemoOrders', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER, ADMIN]));

    const { excludeDemoOrders, getDemoCustomerId } = await import('./exclude');
    await excludeDemoOrders();
    await getDemoCustomerId();

    expect(mocks.userFind).toHaveBeenCalledOnce();
  });
});

describe('getDemoOwnerIds', () => {
  it('returns both demo account ids', async () => {
    mocks.userFind.mockReturnValue(findChain([CUSTOMER, ADMIN]));

    const { getDemoOwnerIds } = await import('./exclude');
    expect(await getDemoOwnerIds()).toEqual([CUSTOMER._id, ADMIN._id]);
  });

  it('returns an empty list on a fresh database', async () => {
    mocks.userFind.mockReturnValue(findChain([]));

    const { getDemoOwnerIds } = await import('./exclude');
    expect(await getDemoOwnerIds()).toEqual([]);
  });
});
