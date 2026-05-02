import Image from 'next/image';

import ShopImage from '@/assets/images/butcher-shop.jpg';
import Reveal from '@/components/uielements/Reveal';

import SectionEyebrow from './SectionEyebrow';

const SignatureSvg = () => (
  <svg
    width='90'
    height='40'
    viewBox='0 0 90 40'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.6}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    className='shrink-0 text-ink'
  >
    <path d='M4 28 C 12 8, 22 8, 28 24 C 30 32, 24 36, 18 30 C 16 28, 22 16, 32 18 C 42 20, 44 30, 52 26 C 60 22, 56 12, 64 14 C 72 16, 68 30, 80 24 L 86 22' />
  </svg>
);

const About = () => {
  return (
    <section
      aria-labelledby='about-heading'
      className='bg-cream-deep pt-25 pb-35'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow num='02' label='Our Story' />
        </Reveal>

        <div className='grid grid-cols-1 items-start gap-20 lg:grid-cols-2'>
          <Reveal delayMs={80}>
            <h2
              id='about-heading'
              className='mb-12 font-display text-[clamp(36px,4.5vw,56px)] leading-[1.05] tracking-tight font-normal'
            >
              A modern shop, with old{' '}
              <em className='font-normal italic text-oxblood'>standards.</em>
            </h2>

            <p className='mb-5.5 max-w-[52ch] text-base leading-[1.75] text-ink-soft first-letter:float-left first-letter:mt-1.5 first-letter:mr-3 first-letter:font-display first-letter:text-[60px] first-letter:leading-[0.9] first-letter:font-medium first-letter:text-oxblood'>
              EliteCuts is a modernized butcher shop that combines traditional
              cuts with high-quality meats and exceptional service. Established
              in 2018, our store is dedicated to offering the finest cuts in
              Southern California, with a shopping experience that prizes both
              the quality of our products and the excellence of our service.
            </p>
            <p className='mb-5.5 max-w-[52ch] text-base leading-[1.75] text-ink-soft'>
              Customers can order online and pick up at our store — a seamless,
              hassle-free way to shop. Whether you&apos;re a steak connoisseur
              or simply appreciate the finest cuts, we&apos;re committed to
              meeting and exceeding expectations every visit.
            </p>
            <p className='mb-5.5 max-w-[52ch] text-base leading-[1.75] text-ink-soft'>
              Our commitment to quality extends beyond our products. We
              actively support local farmers and producers, ensuring everything
              we sell is sustainably sourced and ethically raised.
            </p>

            <div className='mt-12 flex items-center gap-6 border-t border-line pt-8'>
              <SignatureSvg />
              <div className='font-display'>
                <div className='text-lg font-medium italic'>Tangelo Doe</div>
                <div className='text-sm font-sans not-italic tracking-[0.04em] text-muted'>
                  Founder, EliteCuts
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={160}>
            <div className='relative'>
              <div className='relative aspect-4/5 overflow-hidden rounded-sm'>
                <Image
                  src={ShopImage}
                  alt='Outside the EliteCuts store, established 2018'
                  fill
                  sizes='(min-width: 1024px) 50vw, 100vw'
                  className='object-cover filter-[contrast(1.05)_saturate(0.9)]'
                />
              </div>
              <div className='mt-4 flex items-center gap-3 text-xs tracking-[0.18em] uppercase text-muted'>
                <span aria-hidden='true' className='h-px w-6 bg-current' />
                Our Store, est. 2018
              </div>
              <div className='mt-6 inline-flex flex-col rounded-sm bg-ink px-7 py-6 text-cream shadow-[0_20px_50px_rgba(0,0,0,0.15)] lg:absolute lg:bottom-16 lg:-left-8 lg:mt-0'>
                <div className='mb-1.5 font-display text-[clamp(36px,4vw,44px)] leading-none tracking-[-0.03em] font-normal'>
                  <em className='font-normal italic text-camel'>08+</em> yrs
                </div>
                <div className='text-[11px] tracking-[0.18em] uppercase opacity-70'>
                  Serving SoCal
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default About;
