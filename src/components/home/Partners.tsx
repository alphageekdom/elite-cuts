import Image, { type StaticImageData } from 'next/image';

import GrillImage from '@/assets/images/grill.jpg';
import KnivesImage from '@/assets/images/knives.jpg';
import Reveal from '@/components/uielements/Reveal';

type Partner = {
  title: string;
  body: string;
  href: string;
  image: StaticImageData;
};

const PARTNERS: readonly Partner[] = [
  {
    title: 'Premium Grills',
    body: 'Explore premium grills from our esteemed partner — renowned for craftsmanship, durability, and the kind of sear only serious heat can deliver.',
    href: 'https://rcsgasgrills.com/collections/bbq-grills',
    image: GrillImage,
  },
  {
    title: 'Kitchen Knives',
    body: 'Exquisite knife sets from a sponsor recognized for precision and culinary craftsmanship — built to honor every cut you bring home.',
    href: 'https://cutleryandmore.com/collections/kitchen-knives-cutlery',
    image: KnivesImage,
  },
];

const ArrowIcon = () => (
  <svg
    width='14'
    height='14'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
  >
    <path d='M5 12h14M13 5l7 7-7 7' />
  </svg>
);

const Partners = () => {
  return (
    <section
      aria-labelledby='partners-heading'
      className='pt-35 pb-25 bg-cream'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <div className='mb-16 flex items-baseline gap-6'>
            <span className='font-display text-sm font-medium tracking-[0.04em] text-camel'>
              01
            </span>
            <span className='text-xs font-medium tracking-[0.22em] uppercase text-muted'>
              Featured Partners
            </span>
            <span aria-hidden='true' className='h-px flex-1 bg-line' />
          </div>
        </Reveal>

        <Reveal delayMs={80}>
          <h2
            id='partners-heading'
            className='mb-20 max-w-[18ch] font-display text-[clamp(40px,5vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal'
          >
            The tools that make a great cut{' '}
            <em className='font-normal italic text-oxblood'>even better.</em>
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]'>
          {PARTNERS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 80}>
              <article className='group overflow-hidden rounded-sm bg-paper transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none'>
                <div className='relative h-[380px] overflow-hidden'>
                  <span className='absolute top-5 left-5 z-2 rounded-full bg-cream px-3.5 py-1.5 text-[11px] font-medium tracking-[0.15em] uppercase text-ink'>
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
                <div className='px-10 pt-9 pb-10'>
                  <h3 className='mb-3.5 font-display text-[32px] tracking-[-0.015em] font-medium'>
                    {p.title}
                  </h3>
                  <p className='mb-7 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft'>
                    {p.body}
                  </p>
                  <a
                    href={p.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2.5 border-b border-ink pb-1 text-sm font-medium tracking-[0.04em] text-ink transition-[gap,color] duration-300 hover:gap-4 hover:text-oxblood motion-reduce:transition-none'
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
