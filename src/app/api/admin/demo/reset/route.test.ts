import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ── What this covers ────────────────────────────────────────────────────
// The response this route gives when the reset only PARTLY succeeded, which
// is the case it exists for: this is the manual recovery path an admin reaches
// for after a nightly run misbehaved. It used to answer a flat "Demo data
// reset" regardless, so an admin whose ratings had failed to recompute was
// told the repair worked.
//
// Deliberately still a 200. A 500 would send the client down its `!res.ok`
// branch, which discards `data` — so the admin would lose the counts and be
// told nothing had happened, when the wipe and restore genuinely ran. The cron
// sibling answers 500 on the same condition because its consumer is a
// status-based monitor, not a person reading a toast.
//
// Note what this message is NOT. `DemoResetCard` is the only consumer and it
// ignores this string on the success path, building its own summary from
// `data`; the admin-facing warning is covered in `DemoResetCard.test.tsx`.
// This is here so the payload cannot claim a clean reset while `data` reports
// failures — an earlier version of this comment said "the signal belongs in
// the message", which was wrong: no admin ever reads it.
//
// `resetDemoData` is mocked for the same reason as in the cron sibling's test:
// importing it for real drags `server-only` and a dozen Mongoose models in.

const mocks = vi.hoisted(() => ({
  resetDemoData: vi.fn(),
  getSessionUser: vi.fn(),
  isDemoAdmin: vi.fn(() => false),
}));

// The real module is `server-only`, so it cannot be `importActual`'d here.
// `DemoResetInProgressError` is redeclared inside the factory instead — the
// route only uses it for an `instanceof` check, and it imports the class from
// this same mocked module, so the identity lines up.
vi.mock('@/lib/demo/reset', () => ({
  resetDemoData: mocks.resetDemoData,
  DemoResetInProgressError: class DemoResetInProgressError extends Error {},
}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/auth/demo-permissions', () => ({
  isDemoAdmin: mocks.isDemoAdmin,
}));

const req = () => ({}) as unknown as NextRequest;

const counts = (ratingRecomputeFailures: number) => ({
  ordersDeleted: 6,
  ordersSeeded: 6,
  productsRestored: 39,
  userReset: true,
  ratingRecomputeFailures,
});

beforeEach(() => {
  // `restoreAllMocks` only restores `vi.spyOn` spies — these are `vi.fn()`s, so
  // their call history would otherwise carry across tests and the "must not be
  // called" assertion below would read hits from the two tests before it.
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.getSessionUser.mockResolvedValue({
    userId: 'admin-1',
    user: { isAdmin: true },
  });
  mocks.isDemoAdmin.mockReturnValue(false);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('POST /api/admin/demo/reset', () => {
  it('names the failed recomputes instead of reporting a flat success', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(3));
    const { POST } = await import('./route');

    const res = await POST(req(), undefined as never);

    // 200 on purpose — see the note at the top of this file.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe(
      'Demo data reset, but some ratings could not be recomputed',
    );
    // The counts must survive, so the card can say how many.
    expect(body.data.ratingRecomputeFailures).toBe(3);
    expect(body.data.productsRestored).toBe(39);
  });

  it('reports a plain success on a clean run', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { POST } = await import('./route');

    const res = await POST(req(), undefined as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Demo data reset');
  });

  it('still refuses a demo-admin session, which must not be able to reset itself', async () => {
    mocks.isDemoAdmin.mockReturnValue(true);
    const { POST } = await import('./route');

    const res = await POST(req(), undefined as never);

    expect(res.status).toBe(403);
    expect(mocks.resetDemoData).not.toHaveBeenCalled();
  });
});
