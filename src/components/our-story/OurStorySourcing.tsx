import Image from 'next/image';
import SectionHead from '@/components/ui/SectionHead';
import Reveal from '@/components/uielements/Reveal';
import { PARTNERS, PARTNER_COUNT } from '@/lib/our-story/partners';

export default function OurStorySourcing() {
  return (
    <section className='px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <SectionHead label='Where it comes from' />
        </Reveal>

        <Reveal>
          <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-tight'>
            Sources you can <em className='text-oxblood italic'>name.</em>
          </h2>
        </Reveal>
        <Reveal>
          <p className='text-ink-soft mb-16 max-w-[50ch] text-base'>
            We don&apos;t work with distributors. These are the{' '}
            {PARTNER_COUNT} farms behind everything in the case — we&apos;ve
            walked their land, met their animals, and shaken hands on the deal.
          </p>
        </Reveal>

        {PARTNERS.map((partner) => (
          <Reveal key={partner.title}>
            <div
              className={`border-line-soft last:border-line-soft grid items-center gap-12 border-t py-14 last:border-b lg:grid-cols-2 ${
                partner.flip ? 'lg:*:first:order-2 lg:*:last:order-1' : ''
              }`}
            >
              <div className='relative'>
                <div className='relative aspect-4/3 overflow-hidden rounded-sm'>
                  <Image
                    src={partner.img}
                    // Decorative: the farm name is the h3 beside this image.
                    alt=''
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
                <div className='text-camel-deep mb-4 text-[11px] tracking-[0.22em] uppercase'>
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
          </Reveal>
        ))}
      </div>
    </section>
  );
}
