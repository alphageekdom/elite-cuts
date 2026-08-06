import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';

import {
  withAdmin,
  withAdminNonDemo,
  withAuth,
  withCronSecret,
  type RouteContext,
} from './api-handler';

// This file used to say the session wrappers "belong with an auth-layer suite",
// and that suite was never written — so `withAdmin` (30 route handlers),
// `withAdminNonDemo` (15) and `withAuth` (14) gated 59 handlers between them
// with nothing holding them correct. Measured rather than assumed, twice, by
// deleting the guard and running the suite:
//
//   • Delete `withAdmin`'s `isAdmin` check — every logged-in customer becomes
//     an admin on all 30 handlers using it — and all 1135 tests, typecheck AND
//     lint stayed green.
//   • Delete `withAdminNonDemo`'s demo guard and exactly ONE test failed,
//     reaching one of its 15 handlers (`admin/demo/reset`).
//
// Both branches are covered below, so both mutations now fail here by name.
//
// The counts are handlers, not files — 16, 6 and 7 files respectively, several
// exporting three or four verbs each. A first draft of this comment said "~45
// routes", "21" and "28"; those were grep line-counts and file-counts read as
// route-counts, and all three were wrong.
const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(async () => undefined),
  getSessionUser: vi.fn(),
  isDemoAdmin: vi.fn(() => false),
}));

vi.mock('@/config/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/auth/demo-permissions', () => ({ isDemoAdmin: mocks.isDemoAdmin }));

const SECRET = 'correct-horse-battery-staple';

// Minimal stand-in: the wrapper reads exactly one header and the pathname.
const req = (authorization?: string) =>
  ({
    headers: { get: (k: string) => (k === 'authorization' ? (authorization ?? null) : null) },
    nextUrl: { pathname: '/api/cron/dormancy-scan' },
  }) as unknown as NextRequest;

// The session wrappers never read the request — they pass it straight to the
// handler — so an empty object is the honest stand-in here.
const sessionReq = () => ({}) as unknown as NextRequest;
const ctx = <T,>(params: T): RouteContext<T> => ({ params: Promise.resolve(params) });

const session = (over: { userId?: string | null; isAdmin?: boolean } = {}) => ({
  userId: 'userId' in over ? over.userId : 'user-1',
  user: { isAdmin: over.isAdmin ?? false },
});

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // `restoreAllMocks` only restores `vi.spyOn` spies — these are `vi.fn()`s, so
  // their call history would otherwise carry between tests and the
  // "not called" assertions would read hits from earlier ones.
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.connectDB.mockResolvedValue(undefined);
  mocks.getSessionUser.mockResolvedValue(null);
  mocks.isDemoAdmin.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('withCronSecret — the gate', () => {
  it('refuses with 503 when no secret is configured, without running the job', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const job = vi.fn(async () => ({ ok: true }));
    const res = await withCronSecret(job, 'done')(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(503);
    expect(job).not.toHaveBeenCalled();
  });

  it('refuses a request with no Authorization header', async () => {
    const job = vi.fn(async () => ({ ok: true }));
    const res = await withCronSecret(job, 'done')(req());

    expect(res.status).toBe(401);
    expect(job).not.toHaveBeenCalled();
  });

  it('refuses a wrong secret of the same length', async () => {
    const wrong = 'x'.repeat(SECRET.length);
    const res = await withCronSecret(async () => ({ ok: true }), 'done')(
      req(`Bearer ${wrong}`),
    );
    expect(res.status).toBe(401);
  });

  // The length pre-check exists because Node's timingSafeEqual THROWS on
  // mismatched buffer lengths. Without it a short guess would escape the gate
  // as a 500 rather than a 401 — a different response, which is exactly the
  // signal the constant-time compare exists to deny.
  it('refuses a correct-prefix guess that is too short, as a 401 and not a 500', async () => {
    const res = await withCronSecret(async () => ({ ok: true }), 'done')(
      req(`Bearer ${SECRET.slice(0, 5)}`),
    );
    expect(res.status).toBe(401);
  });

  it('refuses a correct-prefix guess that is too long', async () => {
    const res = await withCronSecret(async () => ({ ok: true }), 'done')(
      req(`Bearer ${SECRET}extra`),
    );
    expect(res.status).toBe(401);
  });

  it('accepts the scheme case-insensitively and tolerates surrounding space', async () => {
    const res = await withCronSecret(async () => ({ ok: true }), 'done')(
      req(`bearer   ${SECRET}   `),
    );
    expect(res.status).toBe(200);
  });

  it('accepts a bare secret with no scheme', async () => {
    const res = await withCronSecret(async () => ({ ok: true }), 'done')(req(SECRET));
    expect(res.status).toBe(200);
  });
});

describe('withCronSecret — the response contract', () => {
  it('spreads the job result alongside the success message', async () => {
    const res = await withCronSecret(
      async () => ({ warned: 3, softDeleted: 1 }),
      'Dormancy scan complete',
    )(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: 'Dormancy scan complete',
      warned: 3,
      softDeleted: 1,
    });
  });

  it('answers 500 with a generic message when the job throws', async () => {
    const res = await withCronSecret(async () => {
      throw new Error('mongo exploded');
    }, 'done')(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Something went wrong');
    // The thrown detail belongs in the log, not the body.
    expect(JSON.stringify(body)).not.toContain('mongo exploded');
  });
});

describe('withCronSecret — partial failure must not read as success', () => {
  // The finding this closes: both jobs collect per-item failures and keep
  // going, so a run where every single user failed answered 200. In the cron
  // log — and to any status-based monitor — that is indistinguishable from a
  // clean run. 207 was considered and rejected: it is still 2xx and would read
  // as green in exactly the same way.
  it('answers 500 when the job reports failures, and says how many', async () => {
    const res = await withCronSecret(
      async () => ({ warned: 0, failed: 12 }),
      'Dormancy scan complete',
      { failureCount: (r) => r.failed },
    )(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Dormancy scan complete — 12 failure(s)');
    // The counts still ride along so the detail is there once someone looks.
    expect(body.failed).toBe(12);
    expect(body.warned).toBe(0);
  });

  it('answers 200 when the same job reports a clean run', async () => {
    const res = await withCronSecret(
      async () => ({ warned: 4, failed: 0 }),
      'Dormancy scan complete',
      { failureCount: (r) => r.failed },
    )(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: 'Dormancy scan complete',
      warned: 4,
      failed: 0,
    });
  });

  it('leaves a job with no failure notion answering 200', async () => {
    const res = await withCronSecret(
      async () => ({ productsRestored: 39 }),
      'Demo data reset',
    )(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
  });
});

// ── The session wrappers ────────────────────────────────────────────────

// Typed with the full handler signature on purpose. A bare `() => …` makes
// `vi.fn(ok).mock.calls[0]` an empty tuple, so the assertions below that read
// the third argument — the verified userId, the whole point of the wrapper —
// would not compile.
const ok = async (
  _req: NextRequest,
  _ctx: RouteContext,
  _userId: string,
): Promise<NextResponse> => NextResponse.json({ data: 'handler ran' });

describe('withAdmin', () => {
  it('refuses an anonymous request with 401, without running the handler', async () => {
    const handler = vi.fn(ok);
    const res = await withAdmin(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  // A session object that exists but carries no userId is the tombstoned case
  // — `getSessionUser` returns a session whose user was deleted mid-flight.
  // The wrapper keys on `userId`, not on the session being truthy.
  it('refuses a session carrying no userId', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ userId: null, isAdmin: true }));
    const handler = vi.fn(ok);
    const res = await withAdmin(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  // THE mutation that survived the whole 1135-test suite. Deleting the check
  // this covers hands every logged-in customer admin rights on 21 routes.
  it('refuses a signed-in non-admin with 403, without running the handler', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ isAdmin: false }));
    const handler = vi.fn(ok);
    const res = await withAdmin(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ message: 'Admin access required' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the handler for an admin, handing it the verified userId', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ userId: 'admin-7', isAdmin: true }));
    const handler = vi.fn(ok);
    await withAdmin(handler)(sessionReq(), ctx({ id: 'abc' }));

    expect(handler).toHaveBeenCalledTimes(1);
    // Third argument is the userId the handler trusts instead of re-reading the
    // session. A wrapper that passed the wrong one would authorise as A and act
    // as B.
    expect(handler.mock.calls[0][2]).toBe('admin-7');
    // The route context passes through so `[id]` routes can await their params.
    await expect(handler.mock.calls[0][1].params).resolves.toEqual({ id: 'abc' });
  });

  it('returns the handler’s own response untouched', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ isAdmin: true }));
    const res = await withAdmin(async () =>
      NextResponse.json({ data: { id: 9 }, message: 'Created' }, { status: 201 }),
    )(sessionReq(), ctx({}));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ data: { id: 9 }, message: 'Created' });
  });
});

describe('withAdminNonDemo', () => {
  it('refuses an anonymous request with 401', async () => {
    const handler = vi.fn(ok);
    const res = await withAdminNonDemo(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('refuses a signed-in non-admin with 403', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ isAdmin: false }));
    const handler = vi.fn(ok);
    const res = await withAdminNonDemo(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  // This is what makes the public demo safe to hand a recruiter: a visitor
  // signed in as the seeded demo admin can read every dashboard but must not
  // be able to change what the next visitor sees.
  it('refuses a demo admin with 403, without running the handler', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ isAdmin: true }));
    mocks.isDemoAdmin.mockReturnValue(true);
    const handler = vi.fn(ok);
    const res = await withAdminNonDemo(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      message: 'This action is disabled for demo accounts.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('asks isDemoAdmin about the session user, not about something else', async () => {
    const user = { isAdmin: true, isDemo: false, email: 'real@shop.test' };
    mocks.getSessionUser.mockResolvedValue({ userId: 'admin-1', user });
    await withAdminNonDemo(vi.fn(ok))(sessionReq(), ctx({}));

    expect(mocks.isDemoAdmin).toHaveBeenCalledWith(user);
  });

  it('runs the handler for a real admin', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ userId: 'admin-2', isAdmin: true }));
    const handler = vi.fn(ok);
    const res = await withAdminNonDemo(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(200);
    expect(handler.mock.calls[0][2]).toBe('admin-2');
  });
});

describe('withAuth', () => {
  it('refuses an anonymous request with 401, without running the handler', async () => {
    const handler = vi.fn(ok);
    const res = await withAuth(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('refuses a session carrying no userId', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ userId: null }));
    const handler = vi.fn(ok);
    const res = await withAuth(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  // Deliberately NOT an admin. `withAuth` gates the customer routes — cart,
  // saved cuts, messages, reviews, profile — so requiring a role here would
  // lock every customer out of their own account.
  it('runs the handler for any signed-in customer, handing it the userId', async () => {
    mocks.getSessionUser.mockResolvedValue(session({ userId: 'cust-3', isAdmin: false }));
    const handler = vi.fn(ok);
    const res = await withAuth(handler)(sessionReq(), ctx({}));

    expect(res.status).toBe(200);
    expect(handler.mock.calls[0][2]).toBe('cust-3');
  });
});

describe('every session wrapper connects before running the handler', () => {
  // Each wrapper's doc comment promises the handler "does not need to call
  // connectDB() or getSessionUser() again", and all 59 handlers take that at
  // its word by querying immediately. Drop the `await connectDB()` and every
  // one breaks at runtime while the type checker stays silent.
  //
  // Ordering is asserted, not just the call: "connected at some point" would
  // still pass if the connection opened after the handler had already tried to
  // query. `invocationCallOrder` is a suite-wide monotonic counter, so the
  // comparison is between the two spies rather than against a fixed number.
  it.each([
    ['withAdmin', withAdmin],
    ['withAdminNonDemo', withAdminNonDemo],
    ['withAuth', withAuth],
  ] as const)('%s', async (_name, wrap) => {
    mocks.getSessionUser.mockResolvedValue(session({ isAdmin: true }));
    const handler = vi.fn(ok);
    await wrap(handler)(sessionReq(), ctx({}));

    expect(mocks.connectDB).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mocks.connectDB.mock.invocationCallOrder[0]).toBeLessThan(
      handler.mock.invocationCallOrder[0],
    );
  });
});
