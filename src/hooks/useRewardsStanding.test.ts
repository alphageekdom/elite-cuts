import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardsStanding } from './useRewardsStanding';

// ── What this covers ────────────────────────────────────────────────────
// `loadStanding`'s module-level cache, which is the part of this hook that
// can silently show one customer's rewards standing to another. The hook
// itself needs a DOM (no component-test setup in this repo), but the cache
// rules are plain module logic.
//
// The module is re-imported per test via `vi.resetModules()` so the cache
// starts empty each time — the same pattern `lib/demo/exclude.test.ts` uses
// for its per-process cache.

const TIER = { name: 'Regular', nextThreshold: 250 } as const;

const standing = (qualifying: number): RewardsStanding =>
  ({ tier: TIER, qualifying }) as unknown as RewardsStanding;

const okResponse = (body: unknown) => ({ ok: true, json: async () => body });

/** Import a fresh copy of the module, so the module cache is per-test. */
const freshLoad = async () => {
  const mod = await import('./useRewardsStanding');
  return mod.loadStanding;
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('loadStanding — caching by user', () => {
  it('serves the cached promise for a repeat call with the same user', async () => {
    fetchMock.mockResolvedValue(okResponse(standing(120)));
    const loadStanding = await freshLoad();

    const first = await loadStanding('user-a');
    const second = await loadStanding('user-a');

    expect(first).toEqual({ tier: TIER, qualifying: 120 });
    expect(second).toEqual(first);
    // The point of the cache: opening the desktop menu and then the mobile
    // sheet on one page load costs one request, not two.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches when the user changes', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse(standing(120)))
      .mockResolvedValueOnce(okResponse(standing(40)));
    const loadStanding = await freshLoad();

    const a = await loadStanding('user-a');
    const b = await loadStanding('user-b');

    expect(a?.qualifying).toBe(120);
    expect(b?.qualifying).toBe(40);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never answers one user with another user’s standing', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse(standing(999)))
      .mockResolvedValueOnce(okResponse(standing(1)));
    const loadStanding = await freshLoad();

    await loadStanding('user-a');
    const b = await loadStanding('user-b');

    // Signing out and back in as someone else is client-side navigation with
    // no reload. An unkeyed cache handed B the value fetched for A — the exact
    // regression this keying exists to prevent.
    expect(b?.qualifying).toBe(1);
    expect(b?.qualifying).not.toBe(999);
  });
});

describe('loadStanding — failures are not cached', () => {
  it('retries after a rejected request instead of serving the failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(okResponse(standing(75)));
    const loadStanding = await freshLoad();

    const failed = await loadStanding('user-a');
    const retried = await loadStanding('user-a');

    expect(failed).toBeNull();
    // A cached rejection would leave the standing block permanently empty for
    // the rest of the page load after one blip.
    expect(retried).toEqual({ tier: TIER, qualifying: 75 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a non-ok response as a failure and retries', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse(standing(10)));
    const loadStanding = await freshLoad();

    expect(await loadStanding('user-a')).toBeNull();
    expect(await loadStanding('user-a')).toEqual({ tier: TIER, qualifying: 10 });
  });

  it('does not evict a newer entry when an older request for the same user rejects', async () => {
    // A -> B -> A within one page load. A's first request is still in flight
    // when the second A entry is cached; when it finally rejects, the clean-up
    // must match on promise identity, not on `userId`, or it evicts the valid
    // newer entry. This is the subtlest rule in the module and the one a
    // refactor is most likely to "simplify" away.
    let rejectFirst: (e: Error) => void = () => {};
    const firstA = new Promise((_, rej) => {
      rejectFirst = rej;
    });

    fetchMock
      .mockReturnValueOnce(firstA)
      .mockResolvedValueOnce(okResponse(standing(5)))
      .mockResolvedValueOnce(okResponse(standing(50)));
    const loadStanding = await freshLoad();

    const stale = loadStanding('user-a');
    await loadStanding('user-b');
    const fresh = loadStanding('user-a');

    rejectFirst(new Error('late failure'));
    await stale;
    await fresh;

    // The newer A entry survives the old one's rejection, so this is a cache
    // hit rather than a fourth request.
    await loadStanding('user-a');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('loadStanding — malformed payloads', () => {
  it('reads a payload missing either field as no standing', async () => {
    fetchMock.mockResolvedValue(okResponse({ tier: TIER }));
    const loadStanding = await freshLoad();

    // Defaulting a missing `qualifying` to 0 would draw an empty bar beside a
    // tier label claiming otherwise — two numbers disagreeing on one panel.
    expect(await loadStanding('user-a')).toBeNull();
  });

  it('caches a malformed payload, unlike a rejection', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse({ qualifying: 12 }))
      .mockResolvedValueOnce(okResponse(standing(12)));
    const loadStanding = await freshLoad();

    expect(await loadStanding('user-a')).toBeNull();
    expect(await loadStanding('user-a')).toBeNull();

    // Deliberate, and worth pinning because it reads as inconsistent next to
    // the retry-on-rejection rule above: a malformed body is a server-side
    // shape bug that will answer the same way for the rest of the page load,
    // so retrying it just spends requests. A rejection can be a blip.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
