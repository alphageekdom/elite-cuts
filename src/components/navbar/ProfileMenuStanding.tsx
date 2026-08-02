'use client';

import { tierLabel } from '@/lib/rewards/calculator';
import { useRewardsStanding } from '@/hooks/useRewardsStanding';

const fmt = (n: number) => n.toLocaleString('en-US');

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
  const { standing, settled } = useRewardsStanding(userId);

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
