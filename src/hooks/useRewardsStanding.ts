'use client';

import { useEffect, useState } from 'react';

import type { TierInfo } from '@/lib/rewards/calculator';

export type RewardsStanding = {
  tier: TierInfo;
  /** Qualifying points earned this period — what a progress bar measures. */
  qualifying: number;
};

/**
 * Per-page-load cache, keyed by user.
 *
 * Neither consumer holds a standing across a close on its own — the desktop
 * panel unmounts with the menu, and the mobile sheet stays mounted but only
 * subscribes once it has been opened — so without this, opening one after the
 * other would request twice. Points only move when an order completes, which
 * navigates and therefore drops the cache: a page-load bound is the right
 * staleness.
 *
 * Keyed by `userId` rather than held as a bare value because signing out and
 * back in is client-side navigation with no reload: an unkeyed cache would show
 * the previous account's standing to the next one.
 */
let cache: { userId: string; promise: Promise<RewardsStanding | null> } | null =
  null;

function loadStanding(userId: string): Promise<RewardsStanding | null> {
  if (cache?.userId === userId) return cache.promise;
  const promise = fetch('/api/me/rewards')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
    // Both fields required. Defaulting a missing `qualifying` to 0 would draw
    // an empty bar beside a Connoisseur label — the two-numbers-disagreeing
    // failure the standing block exists to avoid. A malformed payload reads as
    // a failed load instead.
    .then((data: Partial<RewardsStanding>) =>
      data.tier && typeof data.qualifying === 'number'
        ? { tier: data.tier, qualifying: data.qualifying }
        : null,
    )
    .catch(() => {
      // Don't cache a failure — the next open should get another try. Matched
      // on promise identity, not `userId`: an A→B→A switch within one page load
      // leaves A's first request in flight against a newer A entry, and keying
      // on the id would evict that valid newer entry when the old one rejects.
      if (cache?.promise === promise) cache = null;
      return null;
    });
  cache = { userId, promise };
  return promise;
}

/**
 * The signed-in customer's rewards standing, fetched once per page load.
 *
 * Shared by the desktop account menu's standing block and the mobile nav
 * sheet's Rewards row, so the two can't state different standings for the same
 * customer — and so opening both on one page load costs one request, not two.
 *
 * `userId` may be null — for a signed-out visitor, or for a consumer that is
 * mounted but not yet showing anything — in which case nothing is requested and
 * the result settles immediately as "no standing". Pass null rather than
 * calling conditionally: a consumer that renders on every page whether or not
 * it is visible would otherwise request a standing nobody can see.
 *
 * Note this is *qualifying points this period*, not the spendable balance the
 * same endpoint also returns. The two are different numbers and display code
 * must not swap one for the other.
 */
export function useRewardsStanding(userId: string | null): {
  standing: RewardsStanding | null;
  settled: boolean;
} {
  const [standing, setStanding] = useState<RewardsStanding | null>(null);
  const [settled, setSettled] = useState(!userId);

  // Drop the previous answer the moment the user changes, adjusting during
  // render so it clears in the same pass rather than a frame later.
  //
  // Without this, a consumer that stays mounted across a sign-out keeps showing
  // the account that just left — the mobile nav sheet did exactly that, still
  // reading "326 / 1,000 pts" to a signed-out visitor, because the effect below
  // early-returns on a null id and never touched the state. The same gap showed
  // one customer's standing to the next on an A→B switch until B's fetch
  // landed. The module cache is keyed by user; this state has to be too.
  const [lastUserId, setLastUserId] = useState(userId);
  if (lastUserId !== userId) {
    setLastUserId(userId);
    setStanding(null);
    setSettled(!userId);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadStanding(userId).then((result) => {
      if (cancelled) return;
      setStanding(result);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { standing, settled };
}
