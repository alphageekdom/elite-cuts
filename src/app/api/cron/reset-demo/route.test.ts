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

// Since 2026-08-08 this route also runs `ensureDeclaredIndexes`, so the nightly
// schedule covers index state without a fourth `vercel.json` cron entry. Mocked
// for the same reason as the reset: importing it for real drags in `server-only`
// and every model. Its own logic is covered in `lib/db/ensure-indexes.test.ts`.
// What matters here is that this route's `failureCount` reads BOTH sources — an
// index build that failed has to fail the run just as a rating recompute does.
vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  resetDemoData: vi.fn(),
  ensureDeclaredIndexes: vi.fn(),
  assertDemoResetTarget: vi.fn(),
}));

// The route verifies the target itself now, before the index pass. Stubbed to
// pass by default; the ordering and the refusal are asserted below.
vi.mock('@/lib/demo/target-guard', () => ({
  assertDemoResetTarget: mocks.assertDemoResetTarget,
}));

// `DemoResetInProgressError` is a REAL class here, not a stub: the route
// discriminates with `instanceof`, so a plain object would silently take the
// rethrow branch and the lock test would pass for the wrong reason.
class FakeInProgress extends Error {}

vi.mock('@/lib/demo/reset', () => ({
  resetDemoData: mocks.resetDemoData,
  DemoResetInProgressError: FakeInProgress,
  // Only the fields the wrapper's `failureCount` selector reads — the point of
  // the lock path is that it returns a COMPLETE count set, so reading these off
  // the result must not produce `undefined` (or, for the array, throw).
  emptyDemoResetCounts: () => ({
    ratingRecomputeFailures: 0,
    validationFailures: [],
  }),
}));
vi.mock('@/lib/db/ensure-indexes', () => ({
  ensureDeclaredIndexes: mocks.ensureDeclaredIndexes,
}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(async () => null),
}));
vi.mock('@/lib/auth/demo-permissions', () => ({
  isDemoAdmin: vi.fn(() => false),
}));

const SECRET = 'correct-horse-battery-staple';

const req = (search = '') =>
  ({
    headers: {
      get: (k: string) => (k === 'authorization' ? `Bearer ${SECRET}` : null),
    },
    nextUrl: {
      pathname: '/api/cron/reset-demo',
      searchParams: new URLSearchParams(search),
    },
  }) as unknown as NextRequest;

/** Only the fields this route's `failureCount` reads. */
const counts = (ratingRecomputeFailures: number, validationFailures: string[] = []) => ({
  ordersDeleted: 0,
  productsRestored: 39,
  ratingRecomputeFailures,
  validationFailures,
});

/** Only the fields this route's `failureCount` and body reads. */
const indexReport = (failureCount = 0) => ({
  models: [],
  declaredTotal: 23,
  failureCount,
  missingTotal: 0,
  extraTotal: 0,
});

beforeEach(() => {
  // Call history only — implementations set per test survive. `vi.hoisted`
  // mocks are not touched by the `restoreAllMocks` in `afterEach`, so without
  // this a "was not called" assertion reads calls from every earlier test.
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // The route logs per-model index detail through `warn`; unspied it would
  // scribble over the test output on every run that reports a gap.
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  mocks.ensureDeclaredIndexes.mockResolvedValue(indexReport());
  mocks.assertDemoResetTarget.mockReturnValue('elite-cuts-test');
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

  it('fails the run when an index build failed, even with a clean reset', async () => {
    // The half that is easy to lose. `failureCount` reads two sources now, and
    // dropping either term leaves the other still passing its own test — so a
    // night where every index build failed would answer 200 behind a clean
    // reset. That is the same "reported success on a fully failed run" defect
    // this file already exists to prevent, arriving through a second door.
    mocks.resetDemoData.mockResolvedValue(counts(0));
    mocks.ensureDeclaredIndexes.mockResolvedValue(indexReport(4));
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Demo data reset — 4 failure(s)');
    expect(body.indexBuildFailures).toBe(4);
  });

  it('keeps the index report when another run holds the lock', async () => {
    // `resetDemoData` signals contention by THROWING, and the shared wrapper's
    // catch discards the whole result object. So without the local catch, the
    // index work ran and its answer went in the bin — on exactly the nights
    // something else was already running. The comment claiming indexes run
    // first "so they are not skipped" was only half true until this.
    mocks.resetDemoData.mockRejectedValue(new FakeInProgress('locked'));
    mocks.ensureDeclaredIndexes.mockResolvedValue({
      ...indexReport(0),
      missingTotal: 3,
    });
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      indexesMissing: 3,
      resetSkipped: true,
      // A full zeroed count set, so the wrapper's selector cannot read
      // `undefined` and compute NaN.
      ratingRecomputeFailures: 0,
    });
  });

  it('still rethrows a real reset failure', async () => {
    // The contention catch must not swallow anything else.
    mocks.resetDemoData.mockRejectedValue(new Error('database on fire'));
    const { GET } = await import('./route');

    expect((await GET(req())).status).toBe(500);
  });

  it('reports index state on a clean run so a gap is visible without a failure', async () => {
    // A missing index deliberately does NOT fail the run: it is a finding that
    // needs a human, not a job that failed. (An earlier version of this comment
    // said "nothing has imported that model yet" — that is the `autoIndex`
    // failure mode and it cannot happen inside `ensureDeclaredIndexes`, which
    // imports every model and awaits a build on each.) It still has to be
    // reported, or the gap is invisible.
    mocks.resetDemoData.mockResolvedValue(counts(0));
    mocks.ensureDeclaredIndexes.mockResolvedValue({
      ...indexReport(0),
      missingTotal: 2,
      extraTotal: 1,
    });
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      indexesDeclared: 23,
      indexesMissing: 2,
      indexesExtra: 1,
    });
  });
});

describe('POST /api/cron/reset-demo — verification, dry run, manual trigger', () => {
  it('fails the run when post-run verification found a gap, despite clean writes', async () => {
    // The third term in `failureCount`, and the one that distinguishes "every
    // step ran" from "the demo works". Dropping it leaves the other two still
    // passing their own tests while a demo missing a whole category of cut
    // answers 200.
    mocks.resetDemoData.mockResolvedValue(
      counts(0, ['product:dry-aged-ribeye', 'promo:WELCOME10']),
    );
    const { POST } = await import('./route');

    const res = await POST(req());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Demo data reset — 2 failure(s)');
    // The identifiers ride along in the body, so the detail survives the
    // status code.
    expect(body.validationFailures).toEqual([
      'product:dry-aged-ribeye',
      'promo:WELCOME10',
    ]);
  });

  it('labels a hand-fired run as cli, so it is distinguishable in the history', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { POST } = await import('./route');

    await POST(req('trigger=cli'));

    expect(mocks.resetDemoData).toHaveBeenCalledWith({ trigger: 'cli' });
  });

  it('defaults to the cron trigger for anything else, including a bogus value', async () => {
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { POST } = await import('./route');

    await POST(req('trigger=whatever'));

    expect(mocks.resetDemoData).toHaveBeenCalledWith({ trigger: 'cron' });
  });

  it('verifies the target BEFORE building indexes, not just before the reset', async () => {
    // `ensureDeclaredIndexes` issues DDL. Running it first meant that in the
    // exact stale-connection scenario this feature exists for, the cron wrote
    // indexes to the database it was about to refuse — contradicting the rule
    // `run-history.ts` states for its own writes.
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { GET } = await import('./route');

    await GET(req());

    expect(mocks.assertDemoResetTarget.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.ensureDeclaredIndexes.mock.invocationCallOrder[0],
    );
  });

  it('builds no indexes and runs no reset when the target guard refuses', async () => {
    mocks.assertDemoResetTarget.mockImplementation(() => {
      throw new Error('refused');
    });
    const { GET } = await import('./route');

    const res = await GET(req());

    expect(res.status).toBe(500);
    expect(mocks.ensureDeclaredIndexes).not.toHaveBeenCalled();
    expect(mocks.resetDemoData).not.toHaveBeenCalled();
  });

  it('has no dry-run branch of its own — ?dryRun=1 is inert here', async () => {
    // `?dryRun=1` used to be handled on this route, and an older deployment
    // silently dropped the unknown parameter and ran a real reset. It moved to
    // `./dry-run` so that a deployment without it cannot route the request to
    // any handler at all. Pinning the parameter as inert here stops it being
    // quietly reintroduced as a second, weaker way in — with the dangerous
    // fallback back in place.
    mocks.resetDemoData.mockResolvedValue(counts(0));
    const { POST } = await import('./route');

    await POST(req('dryRun=1'));

    expect(mocks.resetDemoData).toHaveBeenCalledOnce();
  });
});

// ── The schedule, and its timezone ──────────────────────────────────────
// `vercel.json` is strict JSON and cannot carry a comment, so the explanation
// of what `0 8 * * *` means in wall-clock terms has to live in route.ts — where
// it can drift from the schedule it describes without anything noticing.
//
// This pins the two together. If the expression changes, this fails, which is
// the prompt to go and correct the paragraph in route.ts.
describe('cron schedule', () => {
  it('is 0 8 * * * — UTC, which is 03:00 EST and 04:00 EDT', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');

    const vercelJson = fileURLToPath(
      new URL('../../../../../vercel.json', import.meta.url),
    );
    const config = JSON.parse(readFileSync(vercelJson, 'utf8')) as {
      crons: { path: string; schedule: string }[];
    };

    const entry = config.crons.find((c) => c.path === '/api/cron/reset-demo');

    // Assert the entry was found before asserting its contents — `undefined
    // === undefined` would otherwise let a deleted cron pass as a match.
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe('0 8 * * *');

    // Vercel Cron has no timezone setting; every expression is UTC, always.
    // There is nothing in the file to assert that against, so it is stated
    // here and in route.ts rather than checked.
  });
});
