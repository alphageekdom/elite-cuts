import CopyReferenceButton from './CopyReferenceButton';
import { EYEBROW_BASE } from './confirmationStyles';

type Fact = {
  label: string;
  value: string;
};

type Props = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  sub: string;
  reference: string;
  facts: Fact[];
};

// The dark opening block: what happened, and the reference the counter asks
// for. Everything here is passed in already resolved — the page owns the
// branching so this file stays presentational.
//
// The design also carried "Receipt sent to <email>" and "Cut by Marcus, head
// butcher" among the facts. Neither is real: no mail service is connected to
// this project, and an order has no butcher assigned to it. Both are gone
// rather than softened, so the facts list only holds things the order record
// can actually answer.
const ConfirmationHero = ({
  eyebrow,
  headline,
  headlineAccent,
  sub,
  reference,
  facts,
}: Props) => (
  <div className='bg-ink text-cream'>
    <div className='mx-auto max-w-300 px-6 py-12 sm:px-8 sm:py-14'>
      <div className='grid grid-cols-1 items-end gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16'>
        <div>
          <p
            className={`flex items-center gap-2.5 ${EYEBROW_BASE} text-camel-soft`}
          >
            <span
              className='h-1.5 w-1.5 shrink-0 rounded-full bg-green-bright'
              aria-hidden='true'
            />
            {eyebrow}
          </p>
          <h1 className='mt-4 font-display text-[clamp(38px,6vw,68px)] leading-[1.02] font-normal tracking-tight'>
            {headline}{' '}
            <em className='text-camel-soft italic'>{headlineAccent}</em>
          </h1>
          <p className='mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-cream/75'>
            {sub}
          </p>
        </div>

        <div className='rounded-sm border border-cream/15 bg-ink-soft px-6 py-5'>
          <p className={`${EYEBROW_BASE} text-cream/55`}>Order reference</p>
          {/* Wraps on the narrowest phones: the reference is monospaced with
              wide tracking and can't shrink, so it and the button together
              outgrow the card below about 360px and the button would sit
              outside the border. */}
          <div className='mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3'>
            <span className='font-mono text-[24px] tracking-widest text-cream sm:text-[27px]'>
              #{reference}
            </span>
            <CopyReferenceButton reference={reference} />
          </div>
          <div className='mt-5 flex flex-col gap-2.5 border-t border-cream/15 pt-5'>
            {facts.map((fact) => (
              <div
                key={fact.label}
                className='flex items-baseline justify-between gap-4'
              >
                <span className='shrink-0 text-[13px] text-cream/55'>
                  {fact.label}
                </span>
                <span className='text-right text-[13.5px] text-cream/90'>
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ConfirmationHero;
