import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ── What this covers ────────────────────────────────────────────────────
// That this route is a dry run and only a dry run.
//
// It is a separate path rather than a `?dryRun=1` flag because a flag fails
// OPEN — see the route itself for the full account.
//
// Nothing here can assert what happens when this route is ABSENT — that is the
// absence of this file on another deployment, not behaviour of this one, and it
// turns out not to be the 404 the first version of this comment assumed (Vercel
// renders the not-found page as a 200; `tools/demo-reset.test.mjs` pins it).
// What this file CAN assert is the half that lives here: that nothing on this
// route writes, and that the body says so.

const mocks = vi.hoisted(() => ({
  dryRunDemoReset: vi.fn(),
  resetDemoData: vi.fn(),
  ensureDeclaredIndexes: vi.fn(),
}));

vi.mock('@/lib/demo/reset', () => ({
  dryRunDemoReset: mocks.dryRunDemoReset,
  // Present so an accidental import of the destructive path would resolve and
  // be caught by the assertion below rather than blowing up as a module error,
  // which reads like a test-setup problem instead of a safety failure.
  resetDemoData: mocks.resetDemoData,
}));
vi.mock('@/lib/db/ensure-indexes', () => ({
  ensureDeclaredIndexes: mocks.ensureDeclaredIndexes,
}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const SECRET = 'correct-horse-battery-staple';

const req = (search = '') =>
  ({
    headers: {
      get: (k: string) => (k === 'authorization' ? `Bearer ${SECRET}` : null),
    },
    nextUrl: {
      pathname: '/api/cron/reset-demo/dry-run',
      searchParams: new URLSearchParams(search),
    },
  }) as unknown as NextRequest;

const plan = () => ({
  database: 'elite-cuts-dev',
  wouldDelete: { orders: 6 },
  wouldRestore: { staff: 6 },
  cannotPredict: ['rating recomputes'],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.dryRunDemoReset.mockResolvedValue(plan());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('POST /api/cron/reset-demo/dry-run', () => {
  it('returns the plan and never calls the destructive reset', async () => {
    const { POST } = await import('./route');

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(mocks.resetDemoData).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({
      dryRun: true,
      database: 'elite-cuts-dev',
      wouldDelete: { orders: 6 },
    });
    // `dryRun: true` is what the CLI asserts on independently of its
    // route-is-absent check, so a proxy or rewrite landing this call on the
    // real endpoint — which answers 2xx JSON, and so passes that check — is
    // still caught.
    // The message must not be the sibling's sentence either — a plan that
    // changed nothing cannot claim a reset happened in the field a human reads
    // first.
    expect(body.message).toBe(
      'Demo reset dry run — nothing was changed (one history row written)',
    );
    expect(body.message).not.toContain('Demo data reset');
  });

  it('runs no index pass, because building an index is a write', async () => {
    // The sibling route does this on every nightly run. Here it would make a
    // "writes nothing" endpoint write something.
    const { POST } = await import('./route');

    await POST(req());

    expect(mocks.ensureDeclaredIndexes).not.toHaveBeenCalled();
  });

  it('carries the cli trigger through so the history row is labelled', async () => {
    const { POST } = await import('./route');

    await POST(req('trigger=cli'));

    expect(mocks.dryRunDemoReset).toHaveBeenCalledWith({ trigger: 'cli' });
  });

  it('defaults to the cron trigger for anything else', async () => {
    const { POST } = await import('./route');

    await POST(req('trigger=nonsense'));

    expect(mocks.dryRunDemoReset).toHaveBeenCalledWith({ trigger: 'cron' });
  });

  // The bearer gate (401 without a header, 503 with no CRON_SECRET) is NOT
  // re-tested here. `api-handler.test.ts` owns `withCronSecret` and covers both,
  // and the sibling route's test defers to it by name — this file was the only
  // one duplicating it. Nor is "this route is wrapped" left unproven: an
  // unwrapped handler returns a plain object, so `res.status` would be
  // undefined and every 200 assertion above would fail.

  it('answers 500 when planning throws, rather than a misleading empty plan', async () => {
    mocks.dryRunDemoReset.mockRejectedValue(new Error('target guard refused'));
    const { POST } = await import('./route');

    expect((await POST(req())).status).toBe(500);
  });
});
