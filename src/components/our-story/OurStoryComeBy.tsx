import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import Reveal from '@/components/uielements/Reveal';

type Props = {
  // Day-range label for the open days, e.g. "Tue–Sat" — derived from the live
  // shop hours rather than stated, so this closing line can't contradict the
  // hours printed in the visit block directly above it.
  openDaysLabel: string | null;
  street: string;
};

export default function OurStoryComeBy({ openDaysLabel, street }: Props) {
  return (
    <section className='bg-oxblood text-cream relative overflow-hidden px-4 py-24 text-center sm:px-8 lg:px-16'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(224,168,107,0.18),transparent_60%)]'
      />
      <div className='relative mx-auto max-w-7xl'>
        <Reveal>
          {/* Cream, not the camel-soft this eyebrow uses on the ink sections:
              camel-soft on oxblood computes to 3.28:1, under AA for 11px text.
              The decorative rule keeps the camel accent. */}
          <div className='text-cream mb-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
            <span aria-hidden className='bg-camel-soft/70 h-px w-7' />
            Come by
          </div>
          <h2 className='font-display mx-auto mb-6 max-w-[16ch] text-[clamp(34px,5vw,64px)] leading-[1.02] font-normal tracking-tight'>
            The rest of the story is{' '}
            <em className='text-camel-soft italic'>behind the counter.</em>
          </h2>
          <p className='text-cream/90 mx-auto mb-10 max-w-[50ch] text-[17px] leading-relaxed'>
            Every chapter above started with someone walking in with a
            question.{' '}
            {openDaysLabel ? `${openDaysLabel} at ${street}` : `At ${street}`}
            {' — bring yours.'}
          </p>
          <Link
            href='/products'
            className='bg-cream text-oxblood-deep hover:bg-paper group/cta inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[15.5px] font-semibold tracking-[0.02em] transition-[background-color,transform] duration-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-oxblood focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          >
            Shop the counter
            <ArrowIcon className='h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0' />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
