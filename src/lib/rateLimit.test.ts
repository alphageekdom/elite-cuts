import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientIpFromHeaders, rateLimit, SWEEP_EVERY_CALLS } from './rateLimit';

// `rateLimit` is the only abuse control in front of sign-in, registration,
// promo application, review creation and the checkout-session route, and it
// had no tests. The store lives on `globalThis` (so Next's dev HMR doesn't
// reset every limiter on save), which means each test needs a unique key
// rather than a torn-down module.

let keySeq = 0;
const freshKey = () => `test-key-${++keySeq}`;

const STORE_KEY = '__elitecuts_rate_limit_store__';
const store = () =>
  (globalThis as unknown as Record<string, Map<string, unknown>>)[STORE_KEY];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit — window behaviour', () => {
  it('allows exactly `max` calls inside one window', () => {
    const key = freshKey();
    const call = () => rateLimit({ key, max: 3, windowMs: 60_000 });

    expect(call().ok).toBe(true);
    expect(call().ok).toBe(true);
    expect(call().ok).toBe(true);
    expect(call().ok).toBe(false);
  });

  it('reports whole seconds until the window resets', () => {
    const key = freshKey();
    for (let i = 0; i < 2; i++) rateLimit({ key, max: 2, windowMs: 60_000 });

    vi.advanceTimersByTime(10_000);
    const blocked = rateLimit({ key, max: 2, windowMs: 60_000 });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(50);
  });

  it('never reports a retry of zero seconds while blocked', () => {
    // A caller turns this straight into a `Retry-After` header; 0 would
    // invite an immediate retry that is still refused.
    const key = freshKey();
    for (let i = 0; i < 2; i++) rateLimit({ key, max: 2, windowMs: 60_000 });

    vi.advanceTimersByTime(59_950);
    const blocked = rateLimit({ key, max: 2, windowMs: 60_000 });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
  });

  it('starts a fresh allowance once the window has passed', () => {
    const key = freshKey();
    for (let i = 0; i < 2; i++) rateLimit({ key, max: 2, windowMs: 60_000 });
    expect(rateLimit({ key, max: 2, windowMs: 60_000 }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(rateLimit({ key, max: 2, windowMs: 60_000 }).ok).toBe(true);
  });

  it('keeps separate keys independent', () => {
    const a = freshKey();
    const b = freshKey();
    rateLimit({ key: a, max: 1, windowMs: 60_000 });

    expect(rateLimit({ key: a, max: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit({ key: b, max: 1, windowMs: 60_000 }).ok).toBe(true);
  });
});

describe('rateLimit — expired buckets are evicted', () => {
  it('drops expired entries instead of growing without bound', () => {
    // Buckets were only ever overwritten when the same key came back, so a
    // stream of one-off keys (a per-user throttle across many users) left the
    // map growing for the life of the process.
    //
    // Count only THIS test's keys, never `store().size`. The store is shared
    // with every other test in the file, so a total is not this test's to
    // assert on: the sibling below leaves 600 expired `noise-*` buckets, and a
    // sweep landing inside the loop here deletes them, so the total could shrink
    // while this test's own keys were all being added correctly. That is what
    // "expected 401 to be greater than 601" meant.
    // `store()` is undefined until the first `rateLimit()` call creates it
    // lazily, which is the case when this test happens to run first — so the
    // optional chain is load-bearing, not defensive padding.
    const mine = () =>
      [...(store()?.keys() ?? [])].filter((k) => String(k).startsWith('sweep-'))
        .length;

    expect(mine()).toBe(0);
    for (let i = 0; i < 400; i++) {
      rateLimit({ key: `sweep-${i}`, max: 1, windowMs: 1_000 });
    }
    // All 400 are inside their window, so no sweep can evict them yet.
    expect(mine()).toBe(400);

    // Past every window, then enough further calls to cross the sweep
    // threshold.
    //
    // This must be a FULL `SWEEP_EVERY_CALLS`, not the difference between it
    // and the loop above. `callsSinceSweep` is module state shared with every
    // other test in this file, so its value here depends on how many rate-limit
    // calls have already run — which depends on test order. The original 120
    // assumed a start of zero and passed only in declaration order; under
    // `--sequence.shuffle` the sweep fired during the 400-loop instead and this
    // batch never reached the threshold again (6 of 8 shuffled runs failed).
    //
    // Any window of `SWEEP_EVERY_CALLS` consecutive calls contains a sweep
    // regardless of the starting offset, so this holds in any order.
    vi.advanceTimersByTime(5_000);
    for (let i = 0; i < SWEEP_EVERY_CALLS; i++) {
      rateLimit({ key: `post-sweep-${i}`, max: 1, windowMs: 1_000 });
    }

    for (let i = 0; i < 400; i++) {
      expect(store().has(`sweep-${i}`)).toBe(false);
    }
  });

  it('never evicts a bucket that is still inside its window', () => {
    const live = freshKey();
    rateLimit({ key: live, max: 1, windowMs: 10 * 60_000 });

    for (let i = 0; i < 600; i++) {
      rateLimit({ key: `noise-${i}`, max: 1, windowMs: 1 });
    }

    // Still counted, so still refused.
    expect(rateLimit({ key: live, max: 1, windowMs: 10 * 60_000 }).ok).toBe(false);
  });
});

describe('clientIpFromHeaders', () => {
  it('takes the first entry of an x-forwarded-for list', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' });
    expect(clientIpFromHeaders(headers)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': ' 198.51.100.7 ' });
    expect(clientIpFromHeaders(headers)).toBe('198.51.100.7');
  });

  it('buckets under a single literal when no proxy headers are present', () => {
    expect(clientIpFromHeaders(new Headers())).toBe('unknown');
  });

  it('reads a plain header map too', () => {
    // NextAuth v4 hands `authorize()` a plain object, not a Headers instance.
    expect(clientIpFromHeaders({ 'x-forwarded-for': '203.0.113.9' })).toBe(
      '203.0.113.9',
    );
    expect(clientIpFromHeaders({ 'x-real-ip': ['198.51.100.2'] })).toBe(
      '198.51.100.2',
    );
  });

  it('ignores an empty forwarded-for and moves on', () => {
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '' }))).toBe(
      'unknown',
    );
  });
});
