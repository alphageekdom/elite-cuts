import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { withCronSecret } from './api-handler';

// Only `withCronSecret` is covered here. The session-based wrappers in the
// same module need a NextAuth session and belong with an auth-layer suite.
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: vi.fn(async () => null) }));
vi.mock('@/lib/auth/demo-permissions', () => ({ isDemoAdmin: vi.fn(() => false) }));

const SECRET = 'correct-horse-battery-staple';

// Minimal stand-in: the wrapper reads exactly one header and the pathname.
const req = (authorization?: string) =>
  ({
    headers: { get: (k: string) => (k === 'authorization' ? (authorization ?? null) : null) },
    nextUrl: { pathname: '/api/cron/dormancy-scan' },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
