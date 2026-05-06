import Image from 'next/image';
import SectionHead from '@/components/ui/SectionHead';
import OurStoryReveal from './OurStoryReveal';

const PARTNERS = [
  {
    eyebrow: 'Beef · Since 2019',
    title: 'Hartwell',
    titleEm: 'Ranch',
    body: 'Family-run since 1962. They raise Black Angus on 4,000 acres of Central Valley grass and finish on a corn-and-barley blend for 120 days. We buy whole carcasses, never less.',
    meta: 'CENTRAL VALLEY · 1.8HR DRIVE',
    img: '/images/our-story/partner-hartwell-ranch.jpg',
    stats: [
      { v: '4,000', unit: 'ac', label: 'Pasture' },
      { v: '120', unit: 'days', label: 'Grain finish' },
      { v: '1962', unit: '', label: 'Family-run since' },
    ],
    flip: false,
  },
  {
    eyebrow: 'Pork · Since 2023',
    title: 'Wildwood',
    titleEm: 'Farm',
    body: "Heritage Berkshire pork, pasture-raised on 80 acres of oak savannah. The hogs forage acorns most of the year. That's why the fat tastes the way it does.",
    meta: 'SAN LUIS OBISPO · 1.5HR DRIVE',
    img: '/images/our-story/partner-wildwood-farm.jpg',
    stats: [
      { v: '80', unit: 'ac', label: 'Oak savannah' },
      { v: '100', unit: '%', label: 'Pasture-raised' },
      { v: '~120', unit: '', label: 'Hogs / year' },
    ],
    flip: true,
  },
  {
    eyebrow: 'Poultry · Since 2021',
    title: 'Sunridge',
    titleEm: 'Farm',
    body: 'Free-range heritage chickens raised on 60 acres of coastal sage scrubland in Ventura County. No antibiotics, no confinement — the birds forage year-round, and the flavor shows it. We take whole-bird delivery every Tuesday and break them down ourselves.',
    meta: 'VENTURA COUNTY · 1.3HR DRIVE',
    img: '/images/our-story/partner-sunridge-farm.jpg',
    stats: [
      { v: '60', unit: 'ac', label: 'Coastal scrubland' },
      { v: '100', unit: '%', label: 'Free-range' },
      { v: '~180', unit: '', label: 'Birds per month' },
    ],
    flip: false,
  },
];

export default function OurStorySourcing() {
  return (
    <section className='px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <OurStoryReveal>
          <SectionHead label='Where it comes from' />
        </OurStoryReveal>

        <OurStoryReveal>
          <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-tight'>
            Sources you can <em className='text-oxblood italic'>name.</em>
          </h2>
        </OurStoryReveal>
        <OurStoryReveal>
          <p className='text-ink-soft mb-16 max-w-[50ch] text-base'>
            We don&apos;t work with distributors. Every partner on this list —
            we&apos;ve walked their land, met their animals, and shaken hands
            on the deal.
          </p>
        </OurStoryReveal>

        {PARTNERS.map((partner) => (
          <OurStoryReveal key={partner.title}>
            <div
              className={`border-line-soft last:border-line-soft grid items-center gap-12 border-t py-14 last:border-b lg:grid-cols-2 ${
                partner.flip ? 'lg:*:first:order-2 lg:*:last:order-1' : ''
              }`}
            >
              <div className='relative'>
                <div className='relative aspect-4/3 overflow-hidden rounded-sm'>
                  <Image
                    src={partner.img}
                    alt={`${partner.title} ${partner.titleEm}`}
                    fill
                    className='object-cover contrast-[1.03] saturate-[0.93]'
                    sizes='(max-width: 1024px) 100vw, 50vw'
                  />
                </div>
                <div className='bg-cream/95 text-ink absolute bottom-4 left-4 rounded-full px-3 py-1.5 font-mono text-[10px] tracking-widest backdrop-blur-sm'>
                  {partner.meta}
                </div>
              </div>
              <div>
                <div className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
                  {partner.eyebrow}
                </div>
                <h3 className='font-display mb-4 text-[clamp(26px,3vw,38px)] leading-[1.1] font-medium tracking-[-0.02em]'>
                  {partner.title}{' '}
                  <em className='text-oxblood font-normal italic'>
                    {partner.titleEm}
                  </em>
                </h3>
                <p className='text-ink-soft max-w-[44ch] text-[15px] leading-[1.65]'>
                  {partner.body}
                </p>
                <div className='border-line-soft mt-6 flex gap-8 border-t pt-6'>
                  {partner.stats.map((s) => (
                    <div key={s.label}>
                      <div className='font-display mb-1 text-[22px] leading-none font-medium tracking-[-0.015em]'>
                        {s.v}
                        {s.unit && (
                          <em className='text-oxblood ml-0.5 text-[14px] font-normal not-italic'>
                            {s.unit}
                          </em>
                        )}
                      </div>
                      <div className='text-muted text-[10px] tracking-[0.18em] uppercase'>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </OurStoryReveal>
        ))}
      </div>
    </section>
  );
}
