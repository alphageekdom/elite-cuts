import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ── What this covers ────────────────────────────────────────────────────
// The wiring, not the job: that this route hands `withCronSecret` a
// `failureCount` reading the field that means "a build failed", and not one of
// the two neighbouring counts that mean something else.
//
// That distinction is the whole contract of the route and it is one token wide.
// `missingTotal` is a finding, not a failure — swapping it in would make every
// environment with an unbuilt index answer 500 forever, which is the "a 500 that
// is routinely noise is a 500 nobody reads" outcome the route's own comment
// argues against. Nothing else in the suite would notice.
//
// `ensureDeclaredIndexes` is mocked because importing it for real drags in
// `server-only` and all nineteen models; its own logic is covered in
// `lib/db/ensure-indexes.test.ts` and the wrapper's 500 in
// `lib/api-handler.test.ts`.

const mocks = vi.hoisted(() => ({ ensureDeclaredIndexes: vi.fn() }));

vi.mock('@/lib/db/ensure-indexes', () => ({
  ensureDeclaredIndexes: mocks.ensureDeclaredIndexes,
}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const SECRET = 'correct-horse-battery-staple';

const req = () =>
  ({
    headers: {
      get: (k: string) => (k === 'authorization' ? `Bearer ${SECRET}` : null),
    },
    nextUrl: { pathname: '/api/cron/ensure-indexes' },
  }) as unknown as NextRequest;

const report = (over: Record<string, number> = {}) => ({
  models: [],
  // Deliberately NOT the real declared count. A fixture matching reality would
  // let a hardcoded literal in the route pass this test, and would rot the day
  // an index is added.
  declaredTotal: 7,
  failureCount: 0,
  missingTotal: 0,
  extraTotal: 0,
  ...over,
});

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // `vi.restoreAllMocks()` restores spies but does not clear a `vi.hoisted`
  // `vi.fn()`, so call history accumulates across tests — which quietly breaks
  // the "was never called" assertion below.
  mocks.ensureDeclaredIndexes.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('GET /api/cron/ensure-indexes', () => {
  it('answers 500 when a build failed, and says how many', async () => {
    mocks.ensureDeclaredIndexes.mockResolvedValue(report({ failureCount: 2 }));
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Declared indexes ensured — 2 failure(s)',
    });
  });

  it('answers 200 when indexes are merely missing, not failed', async () => {
    // The swap this file exists to catch. A gap needs a human to look at it; it
    // does not mean the run failed, and 500ing on it would train everyone to
    // ignore the alert.
    mocks.ensureDeclaredIndexes.mockResolvedValue(
      report({ missingTotal: 4, extraTotal: 2 }),
    );
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      missingTotal: 4,
      extraTotal: 2,
    });
  });

  it('passes the report through so the gap is actionable', async () => {
    mocks.ensureDeclaredIndexes.mockResolvedValue(report());
    const { GET } = await import('./route');

    await expect((await GET(req())).json()).resolves.toMatchObject({
      declaredTotal: 7,
    });
  });

  it('refuses without the secret before touching the database', async () => {
    const { GET } = await import('./route');
    const bad = {
      headers: { get: () => 'Bearer wrong' },
      nextUrl: { pathname: '/api/cron/ensure-indexes' },
    } as unknown as NextRequest;

    expect((await GET(bad)).status).toBe(401);
    expect(mocks.ensureDeclaredIndexes).not.toHaveBeenCalled();
  });

  it('exposes POST as the same handler', async () => {
    mocks.ensureDeclaredIndexes.mockResolvedValue(report());
    const { GET, POST } = await import('./route');

    expect(POST).toBe(GET);
  });
});
