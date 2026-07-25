import Reveal from '@/components/uielements/Reveal';
import { FOUNDED_YEAR } from '@/lib/shop-settings/founding';
import { PARTNER_COUNT } from '@/lib/our-story/partners';

type Props = {
  cityStateZip: string;
  // Live counts — the fact list used to claim "6+ local farms" while the
  // sourcing section named three, and "6 staff" with four team cards below.
  cutCount: number;
  staffCount: number;
  yearsLabel: string;
};

export default function OurStoryHero({
  cityStateZip,
  cutCount,
  staffCount,
  yearsLabel,
}: Props) {
  return (
    <section className='px-4 pt-14 pb-12 sm:pt-18 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <p className='text-muted mb-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase before:h-px before:w-7 before:bg-current before:opacity-50'>
            Our Story · Est. {FOUNDED_YEAR}
          </p>
        </Reveal>

        <Reveal>
          <h1 className='font-display mb-0 max-w-[12ch] text-[clamp(36px,9vw,140px)] leading-[0.92] font-normal tracking-[-0.04em]'>
            A neighborhood <em className='text-oxblood italic'>butcher</em>{' '}
            shop, modernized.
          </h1>
        </Reveal>

        <div className='border-line-soft mt-8 grid gap-8 border-t pt-8 lg:gap-16 lg:grid-cols-[1fr_1.4fr]'>
          <Reveal>
            <div className='text-muted font-mono text-[11px] leading-[1.8] tracking-[0.04em]'>
              <p>
                <strong className='text-ink'>Founded</strong> {FOUNDED_YEAR}
              </p>
              <p>
                <strong className='text-ink'>Location</strong> {cityStateZip}
              </p>
              <p>
                <strong className='text-ink'>Cuts in the case</strong>{' '}
                {cutCount}
              </p>
              <p>
                <strong className='text-ink'>Partner farms</strong>{' '}
                {PARTNER_COUNT}
              </p>
              <p>
                <strong className='text-ink'>Team</strong> {staffCount} on the
                roster
              </p>
            </div>
          </Reveal>
          <Reveal>
            <p className='font-display text-ink-soft max-w-[44ch] text-[19px] leading-[1.55] font-normal tracking-[-0.005em]'>
              We started with one rule —{' '}
              <em className='text-oxblood italic'>
                don&apos;t sell anything you wouldn&apos;t cook for your own
                family.
              </em>{' '}
              {yearsLabel}
              {' later, '}
              that&apos;s still the only one we follow without exception.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
