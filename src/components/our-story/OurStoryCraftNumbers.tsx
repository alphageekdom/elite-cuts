import Reveal from '@/components/ui/Reveal';
import { PARTNER_COUNT } from '@/lib/our-story/partners';
import { CASE_HOURS_MAX } from '@/lib/our-story/standards';

type Props = { yearsLabel: string };

// The farm count is derived from the sourcing list rather than written down —
// this cell used to read "06+" while the sourcing section named three farms.
// The other three are standing shop policies rather than counts, which is why
// the heading no longer promises numbers "you can verify".
const STATS = [
  { v: '28', unit: 'days', label: 'Aging room cycle, climate-controlled' },
  {
    v: String(PARTNER_COUNT),
    unit: '',
    label: 'Partner farms in our supply chain',
  },
  {
    v: `~${CASE_HOURS_MAX}`,
    unit: 'hr',
    label: 'Max time a cut sits in the case',
  },
  { v: '100', unit: '%', label: 'Whole-animal buying — nothing pre-cut' },
];

export default function OurStoryCraftNumbers({ yearsLabel }: Props) {
  return (
    <section className='bg-ink relative overflow-hidden px-4 py-20 sm:px-8 lg:px-16'>
      <div className='pointer-events-none absolute -top-36 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)]' />
      <div className='relative mx-auto max-w-7xl'>
        <Reveal>
          <p className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
            <span aria-hidden>§ </span>
            {yearsLabel} in
          </p>
          <h2 className='font-display text-cream mb-14 max-w-[22ch] text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-normal tracking-tight'>
            The shop, by the{' '}
            <em className='text-camel-soft italic'>numbers.</em>
          </h2>
        </Reveal>

        <div className='grid grid-cols-2 gap-y-10 lg:grid-cols-4'>
          {STATS.map((stat, i) => (
            <Reveal key={stat.label}>
              <div
                className={[
                  // Padding is zeroed on whichever edge is flush with the
                  // section, and that edge differs per breakpoint: the 2-up
                  // phone grid has a flush cell on both sides of every row,
                  // the 4-up desktop row only at its two ends. Unprefixed
                  // pl-0/pr-0 would lose to the sm: padding inside the media
                  // query, which staggered the phone columns and pushed the
                  // first desktop cell off the section's left edge.
                  i % 2 === 0 ? 'pl-0 pr-3 sm:pr-6' : 'pr-0 pl-3 sm:pl-6',
                  i === 0 ? 'lg:pl-0' : 'lg:pl-6',
                  i === 3 ? 'lg:pr-0' : 'lg:pr-6',
                  i % 2 === 0 ? 'border-r border-cream/8' : '',
                  i < 3 ? 'lg:border-r lg:border-cream/8' : 'lg:border-r-0',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className='font-display text-cream mb-3 text-[clamp(36px,6vw,72px)] leading-none font-light tracking-[-0.035em]'>
                  {stat.v}
                  <em className='text-camel ml-0.5 align-[0.1em] text-[0.5em] font-normal not-italic'>
                    {stat.unit}
                  </em>
                </div>
                <div className='text-cream/65 text-[11px] leading-[1.4] tracking-[0.04em] sm:text-[12px]'>
                  {stat.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
