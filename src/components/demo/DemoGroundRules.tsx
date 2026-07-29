import Reveal from '@/components/uielements/Reveal';

type Rule = {
  pill: string;
  tone: 'real' | 'simulated' | 'reset';
  title: string;
  body: string;
};

const PILL_TONE: Record<Rule['tone'], string> = {
  real: 'bg-green-soft text-green-bright',
  simulated: 'bg-camel-soft/20 text-camel-soft',
  reset: 'bg-cream/12 text-cream/75',
};

type Props = { cutCount: number };

// The honest inventory of what a visitor is actually touching. Each claim here
// is checked against the code rather than the design: the catalog and the
// owner-side writes are real, payment is stubbed, and the reset covers the
// catalog and shop config plus everything the demo customer owns.
const buildRules = (cutCount: number): Rule[] => [
  {
    pill: 'Real',
    tone: 'real',
    title: 'The whole catalog',
    body: `All ${cutCount} cuts, real photography, real pricing, and the same search and filtering the live shop runs on.`,
  },
  {
    pill: 'Real',
    tone: 'real',
    title: 'Owner tools that write',
    body: 'Repricing a cut, publishing a promo, moving a shift, changing the rewards rate — these save for real and show up on the storefront.',
  },
  {
    pill: 'Simulated',
    tone: 'simulated',
    title: 'Payment and fulfilment',
    body: "Checkout completes and hands you a receipt, but no card is charged and no order reaches a real queue. You'll see the confirmation; nobody cuts any meat.",
  },
  {
    pill: 'Resets',
    tone: 'reset',
    title: 'Overnight, every night',
    body: 'The catalog and shop settings go back to the snapshot, and the demo shopper’s account — cart, orders, reviews, saved cuts, cards, points — returns to the same starting state. Break what you like.',
  },
];

export default function DemoGroundRules({ cutCount }: Props) {
  return (
    <section className='bg-ink text-cream px-4 py-20 sm:px-8 sm:py-24 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <div className='mb-11 flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12'>
            <div>
              <div className='text-camel mb-5 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
                <span aria-hidden className='bg-camel/60 h-px w-7' />
                Ground rules
              </div>
              <h2 className='font-display max-w-[16ch] text-[clamp(34px,4.6vw,52px)] leading-[1.02] font-normal tracking-tight'>
                What&apos;s real, and what{' '}
                <em className='text-camel-soft italic'>isn&apos;t.</em>
              </h2>
            </div>
            <p className='text-cream/70 max-w-[34ch] text-[15.5px] leading-relaxed md:mb-2'>
              Everything works except the parts that would charge you money or
              send someone to the block.
            </p>
          </div>
        </Reveal>

        {/* 2-up holds until xl. Four across at the lg breakpoint squeezes each
            card to ~205px, which fits but reads cramped for cards this
            text-heavy. */}
        <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-4'>
          {buildRules(cutCount).map((rule, i) => (
            <Reveal key={rule.title} delayMs={i * 70}>
              <div className='border-cream/12 bg-cream/5 flex h-full flex-col rounded-2xl border p-7'>
                <span
                  className={`self-start rounded-full px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.18em] uppercase ${PILL_TONE[rule.tone]}`}
                >
                  {rule.pill}
                </span>
                <h3 className='font-display mt-5 mb-3 text-[23px] leading-[1.15] font-normal'>
                  {rule.title}
                </h3>
                <p className='text-cream/70 text-[14px] leading-[1.65]'>
                  {rule.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
