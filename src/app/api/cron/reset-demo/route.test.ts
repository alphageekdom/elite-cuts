import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ── What this covers ────────────────────────────────────────────────────
// The wiring, not the job: that this route hands `withCronSecret` a
// `failureCount` reading the field the reset actually populates.
//
// That join used to be missing, and nothing but a comment marked it as
// deliberate — one which claimed the demo reset "either succeeds or throws
// outright". It does not: the rating recompute swallows per-product failures
// on purpose so the ~100 restore round-trips behind it still run. So a night
// where every recompute failed answered 200 with a tidy-looking count, which
// is indistinguishable from a clean run to any status-based monitor.
//
// `resetDemoData` is mocked because importing it for real drags `server-only`
// and a dozen Mongoose models in; its own counting is covered in
// `lib/demo/reset.test.ts`, and the wrapper's 500 in `lib/api-handler.test.ts`.
// This file is what stops those two passing while the route joins them wrong.

const mocks = vi.hoisted(() => ({ resetDemoData: vi.fn() }));

vi.mock('@/lib/demo/reset', () => ({ resetDemoData: mocks.resetDemoData }));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: vi.fn(async () => null) }));
vi.mock('@/lib/auth/demo-permissions', () => ({ isDemoAdmin: vi.fn(() => false) }));

const SECRET = 'correct-horse-battery-staple';

const req = () =>
  ({
    headers: {
      get: (k: string) => (k === 'authorization' ? `Bearer ${SECRET}` : null),
    },
    nextUrl: { pathname: '/api/cron/reset-demo' },
  }) as unknown as NextRequest;

/** Only the fields this route's `failureCount` reads. */
const counts = (ratingRecomputeFailures: number) => ({
  ordersDeleted: 0,
  productsRestored: 39,
  ratingRecomputeFailures,
});

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('GET /api/cron/reset-demo', () => {
  it('answers 500 when ratings failed to recompute, and says how many', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(3));
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Demo data reset — 3 failure(s)');
    // The counts still ride along, so the detail is there once someone looks.
    expect(body.productsRestored).toBe(39);
  });

  it('answers 200 on a clean run', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Demo data reset',
      ratingRecomputeFailures: 0,
    });
  });

  it('exposes POST as the same handler, so an ad-hoc trigger reports identically', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(2));
    const { GET, POST } = await import('./route');

    expect(POST).toBe(GET);
    expect((await POST(req())).status).toBe(500);
  });
});
