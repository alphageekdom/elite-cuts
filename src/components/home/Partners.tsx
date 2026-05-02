import Image, { type StaticImageData } from 'next/image';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import GrillImage from '@/assets/images/grill.jpg';
import KnivesImage from '@/assets/images/knives.jpg';
import Reveal from '@/components/uielements/Reveal';

import SectionEyebrow from './SectionEyebrow';

type Partner = {
  title: string;
  body: string;
  href: string;
  image: StaticImageData;
};

const PARTNERS: readonly Partner[] = [
  {
    title: 'Premium Grills',
    body: 'Heavy-duty grills built for the edge-to-edge sear a thick ribeye actually needs — from a partner we trust on heat.',
    href: 'https://rcsgasgrills.com/collections/bbq-grills',
    image: GrillImage,
  },
  {
    title: 'Kitchen Knives',
    body: 'Sharp, balanced blades from a knife shop we trust — the difference between cutting a roast and fighting it.',
    href: 'https://cutleryandmore.com/collections/kitchen-knives-cutlery',
    image: KnivesImage,
  },
];

const Partners = () => {
  return (
    <section
      aria-labelledby='partners-heading'
      className='bg-cream pt-24 pb-20'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow label='Pairings & Tools' />
        </Reveal>

        <Reveal delayMs={80}>
          <h2
            id='partners-heading'
            className='mb-12 max-w-[22ch] font-display text-[clamp(28px,3vw,40px)] leading-[1.1] tracking-[-0.02em] font-normal'
          >
            Tools that earn their place{' '}
            <em className='font-normal italic text-oxblood'>on the counter.</em>
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          {PARTNERS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 80}>
              <article className='group overflow-hidden rounded-sm bg-paper transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none'>
                <div className='relative h-56 overflow-hidden md:h-64 lg:h-72'>
                  <span className='absolute top-4 left-4 z-2 rounded-full bg-cream px-3 py-1 text-[10px] font-medium tracking-[0.15em] uppercase text-ink'>
                    Sponsored
                  </span>
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes='(min-width: 1024px) 50vw, 100vw'
                    className='object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100'
                  />
                </div>
                <div className='px-7 pt-6 pb-7'>
                  <h3 className='mb-2.5 font-display text-[22px] leading-[1.2] tracking-[-0.015em] font-medium'>
                    {p.title}
                  </h3>
                  <p className='mb-5 max-w-[42ch] text-sm leading-relaxed text-ink-soft'>
                    {p.body}
                  </p>
                  <a
                    href={p.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 border-b border-ink pb-0.5 text-[13px] font-medium tracking-[0.04em] text-ink transition-[gap,color] duration-300 hover:gap-3 hover:text-oxblood motion-reduce:transition-none'
                  >
                    Browse the collection
                    <ArrowIcon />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
