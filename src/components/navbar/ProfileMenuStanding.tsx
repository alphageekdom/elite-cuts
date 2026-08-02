'use client';

import { useEffect, useState } from 'react';

import { tierLabel, type TierInfo } from '@/lib/rewards/calculator';

const fmt = (n: number) => n.toLocaleString('en-US');

type Standing = { tier: TierInfo; qualifying: number };

/**
 * Per-page-load cache, keyed by user.
 *
 * The panel unmounts when the menu closes, so without this every open would
 * re-request. Points only move when an order completes, which navigates and
 * therefore drops the cache — so a page-load bound is the right staleness.
 *
 * Keyed by `userId` rather than held as a bare value because signing out and
 * back in is client-side navigation with no reload: an unkeyed cache would show
 * the previous account's standing to the next one.
 */
let cache: { userId: string; promise: Promise<Standing | null> } | null = null;

function loadStanding(userId: string): Promise<Standing | null> {
  if (cache?.userId === userId) return cache.promise;
  const promise = fetch('/api/me/rewards')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
    // Both fields required. Defaulting a missing `qualifying` to 0 would draw
    // an empty bar beside a Connoisseur label — the two-numbers-disagreeing
    // failure this block exists to avoid. A malformed payload collapses the
    // block instead.
    .then((data: Partial<Standing>) =>
      data.tier && typeof data.qualifying === 'number'
        ? { tier: data.tier, qualifying: data.qualifying }
        : null,
    )
    .catch(() => {
      // Don't cache a failure — the next open should get another try.
      if (cache?.userId === userId) cache = null;
      return null;
    });
  cache = { userId, promise };
  return promise;
}

// Placeholder for one line of text. `inline-block` inside the real text span so
// the line box comes from that span's own font-size — which is what keeps the
// loading and loaded states the same height without a hardcoded number to keep
// in step. `align-middle` stops it riding the baseline and growing the box.
const Bar = ({ width }: { width: string }) => (
  <span
    className={`inline-block h-2 rounded-full bg-cream/10 align-middle ${width}`}
  />
);

type Props = { userId: string };

/**
 * The member's standing, inside the navbar account menu.
 *
 * Measures **qualifying points this period**, not the spendable balance — the
 * same number `TierCard` on the account dashboard puts in its bar, worded the
 * same way, so the two surfaces can't state different standings for the same
 * customer. The balance is a different figure and deliberately absent: putting
 * both in a 296px panel is how the rewards page came to contradict itself.
 *
 * The session's `rewardPoints` is not usable here. It is stamped once at
 * sign-in and never refreshed, so it is wrong for every customer who has
 * ordered since — hence the fetch.
 *
 * The loading state renders the loaded layout with the text swapped for bars,
 * rather than a separate skeleton block. A hand-sized skeleton measured 14.5px
 * short, which dropped every row below it by that much the moment the fetch
 * landed — under a pointer already on its way to one of them.
 */
export default function ProfileMenuStanding({ userId }: Props) {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
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

  // A failed load collapses the block entirely. A navigation menu is the wrong
  // place to report a fetch error, and the Rewards row one section down already
  // goes to the page that can.
  if (settled && !standing) return null;

  // Loading reserves the common shape (a bar and a "more unlocks" line). A
  // Master Cut member has neither, so their block shrinks on settle — the one
  // case that still moves, and the rarest tier there is.
  const atMax = standing ? standing.tier.nextTier === null : false;
  const target = standing
    ? (standing.tier.nextThreshold ?? standing.tier.threshold)
    : 0;
  const nextLabel = standing?.tier.nextTier
    ? tierLabel(standing.tier.nextTier)
    : null;

  return (
    <div
      aria-hidden={standing ? undefined : true}
      className='border-b border-cream/9 px-4.5 py-4'
    >
      <div className='flex items-baseline justify-between gap-3'>
        <span className='font-mono text-[10px] tracking-[0.16em] text-camel uppercase'>
          {standing ? standing.tier.label : <Bar width='w-24' />}
        </span>
        {!atMax && (
          <span className='shrink-0 font-display text-[15px] text-camel'>
            {standing ? (
              <>
                {fmt(standing.qualifying)}
                <span className='ml-1 font-sans text-[11.5px] text-cream/50'>
                  / {fmt(target)} pts
                </span>
              </>
            ) : (
              <Bar width='w-16' />
            )}
          </span>
        )}
      </div>

      {atMax && standing ? (
        <p className='mt-2 text-[13px] text-cream/70'>
          Every perk <em className='text-camel-soft italic'>unlocked</em>
        </p>
      ) : (
        <>
          <div
            className='mt-3 h-1 overflow-hidden rounded-full bg-cream/12'
            role={standing ? 'progressbar' : undefined}
            aria-valuenow={standing?.qualifying}
            aria-valuemin={standing ? 0 : undefined}
            aria-valuemax={standing ? target : undefined}
            aria-label={
              standing
                ? `${fmt(standing.qualifying)} of ${fmt(target)} qualifying points toward ${nextLabel}`
                : undefined
            }
          >
            {standing && (
              <div
                className='h-full rounded-full bg-camel'
                style={{ width: `${Math.round(standing.tier.progress * 100)}%` }}
              />
            )}
          </div>
          {/* Same sentence as TierCard's, for the same reason: two surfaces
              stating one measurement should state it identically. */}
          <p className='mt-2.5 text-[12px] text-cream/65'>
            {standing ? (
              `${fmt(standing.tier.pointsToNext)} more unlocks ${nextLabel}.`
            ) : (
              <Bar width='w-40' />
            )}
          </p>
        </>
      )}
    </div>
  );
}
