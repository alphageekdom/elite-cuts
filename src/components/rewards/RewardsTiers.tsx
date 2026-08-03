import CheckIcon from '@/components/ui/icons/CheckIcon';
import Reveal from '@/components/ui/Reveal';
import SectionHead from '@/components/ui/SectionHead';
import { MEMBER_DISCOUNT_RATE } from '@/lib/pricing';
import type { ShopSettings } from '@/models/ShopSettings';

type Props = { settings: ShopSettings };

const fmt = (n: number) => n.toLocaleString('en-US');

const TierCheck = ({ camel = false }: { camel?: boolean }) => (
  <CheckIcon
    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${camel ? 'text-camel-soft' : 'text-green'}`}
  />
);

export default function RewardsTiers({ settings }: Props) {
  const ppd = settings.pointsPerDollar === 1 ? '1 point' : `${settings.pointsPerDollar} points`;
  const conn = settings.connoisseurThreshold;
  const master = settings.masterCutThreshold;
  const weekend = settings.weekendMultiplier;

  // The shop-wide weekend multiplier applies to every tier when it's > 1;
  // we don't claim a tier-specific bonus because no code path actually
  // enforces one. Listing the real, working multiplier keeps the public
  // marketing aligned with the configured reality.
  const weekendPerk = weekend > 1 ? `Earn ${weekend}× on weekend orders` : null;

  // Every line below traces to a real code path or a live setting. That was
  // not true until 2026-08-03: this table advertised a free birthday cut (no
  // surface anywhere collects a birthday), 15% off dry-aged (the only discount
  // in the app is a flat `MEMBER_DISCOUNT_RATE` for any signed-in customer, on
  // everything), first dibs on Wagyu allocations and a quarterly butcher's box
  // (no mechanism for either), and early access to "weekly specials" (not a
  // concept anywhere in the codebase).
  //
  // The measurement that settles it: `currentTier` is written by the tier
  // recalculation and read by the display, and nothing else. No behaviour in
  // this app differs by tier. So the perks are membership perks, and the tiers
  // are the recognition — which is what the table now says, including the note
  // beneath it. Don't add a line here without a code path behind it; the
  // weekend comment above is the standard.
  const memberPerks = [
    `Earn ${ppd} per $1 spent`,
    ...(weekendPerk ? [weekendPerk] : []),
    // Reads from the same constant the cart and checkout summaries label this
    // line with, so the marketing and the arithmetic cannot drift.
    //
    // "applied automatically", not "on every order": a promo carrying
    // `excludesMember` suppresses it, and one of the seeded codes does exactly
    // that. The mechanism is what's universal, not the coverage.
    `${MEMBER_DISCOUNT_RATE * 100}% member discount, applied automatically`,
    // Not "reorder" — that word survived the first pass of this cleanup and is
    // unbacked: nothing in the customer UI re-places a past order, and every
    // `reorder` in the tree is the admin inventory reorder-point. What does
    // exist is add-to-cart on a saved cut, which is what this now says.
    'Save cuts and add them to your cart in a tap',
    'Full order history',
    'Free in-store pickup',
    // Real, and deliberately moved off the top tier: messaging is behind
    // sign-in but carries no tier gate, so billing it as a Master Cut
    // exclusive ("Direct line to our head butcher") was false about the
    // exclusivity rather than about the feature.
    'Message the counter direct',
  ];

  const regularPerks = memberPerks;
  const connoisseurPerks = ['All Regular tier perks', 'Connoisseur status on your profile'];
  const masterCutPerks = ['All Connoisseur tier perks', 'Master Cut status on your profile'];

  return (
    <section className='py-25'>
      <div className='mx-auto max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionHead label='The Tiers' />
        </Reveal>

        <Reveal delayMs={60}>
          <h2 className='mb-14 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
            Three levels of{' '}
            <em className='italic text-oxblood'>thank you.</em>
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-3'>
          <Reveal>
            <article className='rounded-sm border border-line-soft bg-paper p-9 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none'>
              <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-cream-deep text-ink'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='h-4.5 w-4.5' aria-hidden>
                  <circle cx='12' cy='12' r='6' />
                </svg>
              </div>
              <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                Regular
              </h3>
              <p className='mb-7 font-mono text-xs tracking-[0.06em] text-muted'>
                0–{fmt(conn - 1)} PTS · STARTING TIER
              </p>
              <ul className='flex flex-col gap-3.5 border-t border-line-soft pt-6'>
                {regularPerks.map((perk) => (
                  <li key={perk} className='flex items-start gap-2.5 text-sm leading-snug text-ink-soft'>
                    <TierCheck />
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={80}>
            <article className='relative md:-translate-y-3 rounded-sm border border-ink bg-ink p-9 text-cream shadow-[0_30px_80px_rgba(28,24,20,0.2)] transition-transform duration-300 hover:-translate-y-1 md:hover:-translate-y-4 motion-reduce:transition-none motion-reduce:md:hover:-translate-y-3'>
              <span className='absolute top-6 right-6 rounded-full bg-camel px-3 py-1 text-[10px] font-medium tracking-[0.18em] uppercase text-ink'>
                Most popular
              </span>
              <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-camel/20 text-camel'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='h-4.5 w-4.5' aria-hidden>
                  <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                </svg>
              </div>
              <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                Connois<em className='italic text-camel-soft'>seur</em>
              </h3>
              <p className='mb-7 font-mono text-xs tracking-[0.06em] text-cream/55'>
                {fmt(conn)}–{fmt(master - 1)} PTS · MID TIER
              </p>
              <ul className='flex flex-col gap-3.5 border-t border-cream/12 pt-6'>
                {connoisseurPerks.map((perk) => (
                  <li key={perk} className='flex items-start gap-2.5 text-sm leading-snug text-cream/90'>
                    <TierCheck camel />
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={160}>
            <article className='rounded-sm border border-line-soft bg-paper p-9 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none'>
              <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-cream-deep text-ink'>
                <svg viewBox='0 0 24 24' className='h-4.5 w-4.5' aria-hidden>
                  <path
                    d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z'
                    stroke='currentColor'
                    strokeWidth={2}
                    fill='none'
                  />
                  <path
                    d='M12 7l1.5 4.5H18l-3.5 2.6L16 18.5 12 16l-4 2.5 1.5-4.4L6 11.5h4.5z'
                    fill='currentColor'
                  />
                </svg>
              </div>
              <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                Master <em className='italic text-oxblood'>Cut</em>
              </h3>
              <p className='mb-7 font-mono text-xs tracking-[0.06em] text-muted'>
                {fmt(master)}+ PTS · TOP TIER
              </p>
              <ul className='flex flex-col gap-3.5 border-t border-line-soft pt-6'>
                {masterCutPerks.map((perk) => (
                  <li key={perk} className='flex items-start gap-2.5 text-sm leading-snug text-ink-soft'>
                    <TierCheck />
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>

        {/* Says out loud what the lists above imply. Without it a reader sees
            two tiers whose only new line is "status" and reasonably concludes
            the page is broken; with it, the thinness is the message. Preferred
            over padding the upper tiers back out with perks nobody built —
            which is exactly how this table got into the state it was in. */}
        <Reveal delayMs={200}>
          <p className='mt-10 max-w-[62ch] text-sm leading-relaxed text-muted'>
            Tiers track how much you&apos;ve earned with us. Every perk listed
            above is available to every member today — we&apos;d rather show you
            what the counter actually does than list benefits we haven&apos;t
            built.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
