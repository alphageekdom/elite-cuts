import Link from 'next/link';

import type { TierInfo } from '@/lib/rewards/calculator';
import { FOCUS_RING_DARK } from '@/lib/styles';

const fmt = (n: number) => n.toLocaleString('en-US');

type Props = {
  /** Qualifying points earned this period — what the bar measures. */
  qualifying: number;
  tier: TierInfo;
};

// Which rung of the ladder, for the eyebrow. Matches the numbering the
// rewards tab already prints so the two can't disagree.
function tierLevel(tier: TierInfo['tier']): string {
  if (tier === 'masterCut') return '03';
  if (tier === 'connoisseur') return '02';
  return '01';
}

/**
 * The member's standing — the one place in the dashboard chrome that states
 * the tier, and on the Rewards tab it steps aside entirely.
 *
 * Before the redesign the tier appeared three times on a single load: a badge
 * in the hero, a sub-label under the points stat, and a loyalty card in the
 * right rail. Consolidating it here is the point of the card, so nothing else
 * in the shell restates it — the sidebar's identity line carries the email
 * rather than the tier, and `ProfileSidebar` drops this card on the Rewards
 * tab, where the status card is the same content at full size.
 *
 * The upshot is that the tier is stated exactly once per view: this card on
 * five tabs, the status card on the sixth.
 */
export default function TierCard({ qualifying, tier }: Props) {
  const atMax = tier.nextTier === null;
  const target = tier.nextThreshold ?? tier.threshold;
  const progressPct = atMax ? 100 : Math.round(tier.progress * 100);
  const nextLabel = tier.nextTier === 'masterCut' ? 'Master Cut' : 'Connoisseur';

  return (
    <div className="rounded bg-ink p-5 text-cream">
      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-camel">
        Tier {tierLevel(tier.tier)} · {tier.label}
      </p>

      {atMax ? (
        <p className="mt-3 font-display text-[22px] leading-tight tracking-tight">
          Every perk <em className="italic text-camel-soft">unlocked</em>
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-[34px] leading-none tracking-tight">
              {fmt(qualifying)}
            </span>
            <span className="text-[12.5px] text-cream/55">
              / {fmt(target)} pts
            </span>
          </div>
          <div
            className="mt-3 h-1 overflow-hidden rounded-full bg-cream/12"
            role="progressbar"
            aria-valuenow={qualifying}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`${fmt(qualifying)} of ${fmt(target)} qualifying points toward ${nextLabel}`}
          >
            <div
              className="h-full rounded-full bg-camel"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-cream/65">
            {fmt(tier.pointsToNext)} more unlocks {nextLabel}.
          </p>
        </>
      )}

      <Link
        href="/profile?tab=rewards"
        className={`mt-3 inline-flex min-h-11 items-center rounded-sm text-[12.5px] text-camel-soft underline underline-offset-[3px] transition-colors hover:text-camel ${FOCUS_RING_DARK}`}
      >
        See your rewards
      </Link>
    </div>
  );
}
