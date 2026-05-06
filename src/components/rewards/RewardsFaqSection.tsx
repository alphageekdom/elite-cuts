import Link from 'next/link';

import Reveal from '@/components/uielements/Reveal';
import SectionHead from '@/components/ui/SectionHead';
import RewardsFaq from './RewardsFaq';

export default function RewardsFaqSection() {
  return (
    <section className='bg-paper py-25'>
      <div className='mx-auto max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionHead label='Frequently asked' />
        </Reveal>

        <div className='grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_1.4fr] md:gap-20'>
          <Reveal>
            <h2 className='mb-5 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
              Common{' '}
              <em className='italic text-oxblood'>questions.</em>
            </h2>
            <p className='mb-7 max-w-[40ch] text-base leading-[1.65] text-ink-soft'>
              Quick answers to the things people usually want to know. Anything
              we missed? Just ask us at the counter or drop a note via the
              contact form.
            </p>
            <Link
              href='/contact'
              className='inline-flex items-center gap-2 rounded-full border border-line bg-transparent px-7 py-4 text-sm font-medium tracking-[0.02em] text-ink-soft transition-[border-color,background-color,color] duration-300 hover:border-ink hover:bg-cream-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 motion-reduce:transition-none'
            >
              Contact support
            </Link>
          </Reveal>

          <Reveal delayMs={80}>
            <RewardsFaq />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
