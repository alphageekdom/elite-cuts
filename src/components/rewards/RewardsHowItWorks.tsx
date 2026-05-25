import Reveal from '@/components/uielements/Reveal';
import SectionHead from '@/components/ui/SectionHead';
import type { ShopSettings } from '@/models/ShopSettings';
import { formatRedemptionRate } from '@/lib/rewards/calculator';

type Props = { settings: ShopSettings };

const fmt = (n: number) => n.toLocaleString('en-US');

function dollarLabel(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export default function RewardsHowItWorks({ settings }: Props) {
  const pointsLabel = settings.pointsPerDollar === 1
    ? '1 PT'
    : `${settings.pointsPerDollar} PTS`;
  const redemptionLabel = `${fmt(settings.redemptionPoints)} PT = ${dollarLabel(settings.redemptionDollars)} OFF`;
  const redemptionPretty = formatRedemptionRate(settings);

  const steps = [
    {
      n: '01',
      heading: (
        <>
          Order like you{' '}
          <em className='italic text-oxblood'>normally</em> would.
        </>
      ),
      body: `Pick up your usual cuts in-store or online. Every dollar earns ${settings.pointsPerDollar === 1 ? 'one point' : `${settings.pointsPerDollar} points`} automatically — no codes, no fuss.`,
      meta: `$1 = ${pointsLabel}`,
    },
    {
      n: '02',
      heading: (
        <>
          Climb the <em className='italic text-oxblood'>tiers.</em>
        </>
      ),
      body: `Connoisseur at ${fmt(settings.connoisseurThreshold)} points, Master Cut at ${fmt(settings.masterCutThreshold)}. Each tier unlocks better perks — discounts, early access, and a birthday cut on us.`,
      meta: `3 TIERS · ${fmt(settings.masterCutThreshold)} PT TOP`,
    },
    {
      n: '03',
      heading: (
        <>
          Redeem at <em className='italic text-oxblood'>checkout.</em>
        </>
      ),
      body: `Apply points to your next order at ${redemptionPretty}, save them for a special cut, or just enjoy the perks that come with your tier. Your call.`,
      meta: redemptionLabel,
    },
  ];

  return (
    <section id='how' className='bg-cream-deep py-20'>
      <div className='mx-auto max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionHead label='How it works' />
        </Reveal>

        <Reveal delayMs={60}>
          <h2 className='mb-14 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
            Three steps.{' '}
            <em className='italic text-oxblood'>That&apos;s it.</em>
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 gap-12 md:grid-cols-3'>
          {steps.map((step, i) => (
            <Reveal key={step.n} delayMs={i * 80}>
              <div className='relative pt-16 md:pt-12'>
                <div
                  aria-hidden
                  className='absolute top-0 left-0 font-display text-[64px] md:text-[80px] font-normal italic leading-none tracking-tight text-camel opacity-50'
                >
                  {step.n}
                </div>
                <h3 className='relative mb-4 font-display text-[28px] font-medium leading-[1.1] tracking-tight'>
                  {step.heading}
                </h3>
                <p className='max-w-[36ch] text-[15px] leading-[1.65] text-ink-soft'>
                  {step.body}
                </p>
                <span className='mt-5 inline-block rounded-full border border-line-soft bg-paper px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink'>
                  {step.meta}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
