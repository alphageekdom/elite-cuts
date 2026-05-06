import OurStoryReveal from './OurStoryReveal';

const STATS = [
  { v: '28', unit: 'days', label: 'Aging room cycle, climate-controlled' },
  { v: '06', unit: '+', label: 'Local farms in our supply chain' },
  { v: '~36', unit: 'hr', label: 'Max time a cut sits in the case' },
  { v: '100', unit: '%', label: 'Whole-animal buying — nothing pre-cut' },
];

export default function OurStoryCraftNumbers() {
  return (
    <section className='bg-ink relative overflow-hidden px-4 py-20 sm:px-8 lg:px-16'>
      <div className='pointer-events-none absolute -top-36 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)]' />
      <div className='relative mx-auto max-w-7xl'>
        <OurStoryReveal>
          <p className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
            § Eight years, by the numbers
          </p>
          <h2 className='font-display text-cream mb-14 max-w-[22ch] text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-normal tracking-tight'>
            The shop in <em className='text-camel-soft italic'>numbers</em>{' '}
            you can verify.
          </h2>
        </OurStoryReveal>

        <div className='grid grid-cols-2 gap-y-10 lg:grid-cols-4'>
          {STATS.map((stat, i) => (
            <OurStoryReveal key={stat.label}>
              <div
                className={[
                  'px-3 sm:px-6',
                  i % 2 === 0 ? 'border-r border-cream/8' : '',
                  i < 3 ? 'lg:border-r lg:border-cream/8' : 'lg:border-r-0',
                  i === 0 ? 'pl-0' : '',
                  i === 3 ? 'pr-0' : '',
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
            </OurStoryReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
