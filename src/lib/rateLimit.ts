// Per-key fixed-window rate limiter. Used by a handful of unauthenticated
// POST endpoints (register, promo apply) to keep a single IP from racing
// through accounts, codes, or restore attempts.
//
// "Fixed window" = each window starts at the first request and resets after
// `windowMs`, rather than a true sliding window that tracks per-request
// timestamps. Simpler, cheaper, and fine for the rough-throttle threat
// model here — the corner case is a burst on either side of a window
// boundary getting up to `2 * max` through, which is still tight enough
// to block real abuse.
//
// The backing store is in-memory and per-process — fine for a portfolio
// project on a single Node instance. Trade-offs to know about before
// scaling up:
//   - Multi-instance deploys (Vercel auto-scale, multiple Node replicas
//     behind a load balancer): the effective rate becomes `max × instances`
//     because each process keeps its own counter. Swap to a Redis or Vercel
//     KV-backed window when that becomes a real concern.
//   - Process restart / new deploy: state resets. Bots lose progress on
//     redeploy, which for an admin-traffic shop happens more often than
//     attacks, so we accept this.
//   - Per-IP keying via `x-forwarded-for` / `x-real-ip`: behind a single
//     well-behaved reverse proxy that OVERWRITES those headers this is
//     accurate. Where nothing normalises them the caller sets them, so a
//     per-IP limit is bypassable by varying the header — each spoofed value
//     is simply a fresh bucket. Vercel overwrites `x-forwarded-for`, so the
//     deploy target this ships to is fine; a self-hosted proxy that appends
//     rather than replaces is not. Direct callers with no proxy headers at
//     all (curl, dev mode) bucket under `unknown`, which collapses the limit
//     but is the right local-dev behavior.
//
// The state map lives on `globalThis` so Next's dev-mode HMR doesn't reset
// every limiter on each save.

type Bucket = { count: number; resetAt: number };

const STORE_KEY = '__elitecuts_rate_limit_store__';

const getStore = (): Map<string, Bucket> => {
  const g = globalThis as unknown as Record<string, Map<string, Bucket>>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY];
};

export type RateLimitOptions = {
  key: string;
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

// How many calls between sweeps of expired buckets. Buckets were only ever
// overwritten when the SAME key came back, so a stream of one-off keys — a
// per-user throttle across many users, or a spoofed `x-forwarded-for` — grew
// the map without bound for the life of the process. Sweeping on a counter
// rather than a timer keeps the module free of intervals it would have to
// clean up.
// Exported so tests can drive enough calls to guarantee a sweep without
// assuming `callsSinceSweep` starts at zero. It does not: the counter is
// module state shared by every test in the file, so hardcoding a number here
// and a matching number there made the sweep test pass only in the order the
// file happened to declare its tests (6 of 8 shuffled runs failed).
export const SWEEP_EVERY_CALLS = 500;
let callsSinceSweep = 0;

function sweepExpired(store: Map<string, Bucket>, now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function rateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const store = getStore();
  const now = Date.now();

  if (++callsSinceSweep >= SWEEP_EVERY_CALLS) {
    callsSinceSweep = 0;
    sweepExpired(store, now);
  }

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort caller IP derivation. Vercel and most reverse proxies set
// `x-forwarded-for` as a comma-separated list with the originating IP first;
// `x-real-ip` is a common fallback. When neither is present (local dev,
// direct curl), bucket under a single literal so the limit still applies.
//
// Accepts either a `Headers` instance (Web API request handlers) or a plain
// object (NextAuth v4 hands authorize() a plain header map, not a Headers).
type PlainHeaders = Record<string, string | string[] | undefined>;

export function clientIpFromHeaders(headers: Headers | PlainHeaders): string {
  const read = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const raw = headers[name];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const xff = read('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = read('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
