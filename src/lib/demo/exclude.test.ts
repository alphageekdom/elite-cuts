import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// `exclude.ts` pulls in `server-only`, `connectDB`, and the User model.
// None of that runs cleanly outside Next's bundler / a live DB. Mocks
// here exercise:
//   1. excludeDemoOrders — returns a `{ user: { $ne }` fragment when a
//      demo customer exists, and `{}` when none does (no-op spread).
//   2. getDemoCustomerId — returns the id or null.
//   3. The per-process cache — a second call doesn't re-query the User
//      collection.
// The module re-imports between tests via `vi.resetModules()` so the
// cache state is per-test.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    findOne: mocks.userFindOne,
  },
}));

// Match the chained `.select('_id').lean()` on the findOne result.
const findOneChain = (result: unknown) => ({
  select: () => ({
    lean: () => Promise.resolve(result),
  }),
});

beforeEach(() => {
  mocks.userFindOne.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('excludeDemoOrders — demo customer exists', () => {
  it('returns a `user: { $ne: demoId }` fragment for Order queries', async () => {
    const demoId = 'demo-customer-id';
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));

    const { excludeDemoOrders } = await import('./exclude');
    const fragment = await excludeDemoOrders();

    expect(fragment).toEqual({ user: { $ne: demoId } });
  });

  it('looks up the demo customer by isDemo + demoType', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: 'x' }));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();

    expect(mocks.userFindOne).toHaveBeenCalledWith({
      isDemo: true,
      demoType: 'customer',
    });
  });
});

describe('excludeDemoOrders — no demo customer', () => {
  it('returns an empty object so callers can safely spread it', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain(null));

    const { excludeDemoOrders } = await import('./exclude');
    const fragment = await excludeDemoOrders();

    expect(fragment).toEqual({});
  });
});

describe('excludeDemoOrders — per-process cache', () => {
  it('only queries the User collection once even when called repeatedly', async () => {
    const demoId = 'demo-customer-id';
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();
    await excludeDemoOrders();
    await excludeDemoOrders();

    expect(mocks.userFindOne).toHaveBeenCalledOnce();
  });

  it('caches the null result too so a fresh DB does not re-query', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain(null));

    const { excludeDemoOrders } = await import('./exclude');
    await excludeDemoOrders();
    await excludeDemoOrders();

    expect(mocks.userFindOne).toHaveBeenCalledOnce();
  });
});

describe('getDemoCustomerId', () => {
  it('returns the demo customer id when one exists', async () => {
    const demoId = 'demo-customer-id';
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: demoId }));

    const { getDemoCustomerId } = await import('./exclude');
    const result = await getDemoCustomerId();

    expect(result).toBe(demoId);
  });

  it('returns null when no demo customer exists', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain(null));

    const { getDemoCustomerId } = await import('./exclude');
    const result = await getDemoCustomerId();

    expect(result).toBeNull();
  });

  it('shares the same cache as excludeDemoOrders', async () => {
    mocks.userFindOne.mockReturnValue(findOneChain({ _id: 'x' }));

    const { excludeDemoOrders, getDemoCustomerId } = await import('./exclude');
    await excludeDemoOrders();
    await getDemoCustomerId();

    expect(mocks.userFindOne).toHaveBeenCalledOnce();
  });
});
