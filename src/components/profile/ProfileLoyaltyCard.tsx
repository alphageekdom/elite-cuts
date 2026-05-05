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
    </div>
  );
}
