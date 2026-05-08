import Link from 'next/link';

function getTier(pts: number) {
  if (pts >= 1000) return { name: 'Master Cut', nextAt: 1000, atMax: true };
  if (pts >= 250) return { name: 'Connoisseur', nextAt: 1000, atMax: false };
  return { name: 'Regular', nextAt: 250, atMax: false };
}

export default function ProfileLoyaltyCard({ points = 0 }: { points?: number }) {
  const tier = getTier(points);
  const progress = tier.atMax ? 100 : Math.min(100, Math.round((points / tier.nextAt) * 100));

  return (
    <div className="relative overflow-hidden bg-ink rounded p-7">
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)] pointer-events-none" />

      <h3 className="relative font-display font-normal text-[26px] leading-snug tracking-tight text-cream mb-6">
        <span className="block text-[11px] tracking-[0.22em] uppercase text-camel mb-2 not-italic font-normal">— Member tier</span>
        {tier.atMax ? (
          <>You&apos;ve reached <em className="italic text-camel-soft">Master Cut</em></>
        ) : (
          <>{tier.nextAt - points} points to{' '}<em className="italic text-camel-soft">{tier.name === 'Regular' ? 'Connoisseur' : 'Master Cut'}</em></>
        )}
      </h3>

      <div className="relative mb-3">
        <div
          className="h-1.25 rounded-full bg-cream/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={points}
          aria-valuemin={0}
          aria-valuemax={tier.nextAt}
          aria-label={`${points} of ${tier.nextAt} points to next tier`}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-camel to-camel-soft"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2.5 text-cream/60">
          <span>
            <strong className="text-cream font-medium">{points}</strong> points
          </span>
          <span>{tier.nextAt} points</span>
        </div>
      </div>

      <p className="relative text-[13px] text-cream/60 leading-relaxed mt-4">
        {tier.atMax
          ? 'You have unlocked all perks — 15% off dry-aged orders, first dibs on Wagyu, and a quarterly butcher\'s box.'
          : 'Reach Master Cut to unlock 15% off dry-aged orders, first dibs on Wagyu, and a quarterly butcher\'s box.'}
      </p>

      <Link
        href="/profile?tab=rewards"
        className="relative mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-camel-soft border-b border-camel-soft/40 pb-px hover:border-camel-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-camel focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        See your rewards
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
