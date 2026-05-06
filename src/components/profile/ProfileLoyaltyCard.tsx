import Link from 'next/link';

const POINTS = 680;
const NEXT_TIER = 1000;
const PROGRESS = Math.round((POINTS / NEXT_TIER) * 100);

export default function ProfileLoyaltyCard() {
  return (
    <div className="relative overflow-hidden bg-ink rounded p-7">
      {/* Decorative radial glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)] pointer-events-none" />

      <h3 className="relative font-display font-normal text-[26px] leading-snug tracking-tight text-cream mb-6">
        <span className="block text-[11px] tracking-[0.22em] uppercase text-camel mb-2 not-italic font-normal">— Member tier</span>
        {NEXT_TIER - POINTS} points to{' '}
        <em className="italic text-camel-soft">Master Cut</em>
      </h3>

      {/* Progress bar */}
      <div className="relative mb-3">
        <div
          className="h-1.25 rounded-full bg-cream/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={POINTS}
          aria-valuemin={0}
          aria-valuemax={NEXT_TIER}
          aria-label={`${POINTS} of ${NEXT_TIER} points to Master Cut tier`}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-camel to-camel-soft"
            style={{ width: `${PROGRESS}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2.5 text-cream/60">
          <span>
            <strong className="text-cream font-medium">{POINTS}</strong> points
          </span>
          <span>{NEXT_TIER} points</span>
        </div>
      </div>

      <p className="relative text-[13px] text-cream/60 leading-relaxed mt-4">
        Reach Master Cut to unlock 15% off all dry-aged orders and early access
        to weekly specials.
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
