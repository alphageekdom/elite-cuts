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
//     well-behaved reverse proxy this is accurate. Direct callers (curl,
//     dev mode) all bucket under `unknown`, which collapses the limit but
//     is the right local-dev behavior.
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

export function rateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const store = getStore();
  const now = Date.now();
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
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
