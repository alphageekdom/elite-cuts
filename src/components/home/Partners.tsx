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
  linkLabel: string;
  image: StaticImageData;
};

const PARTNERS: readonly Partner[] = [
  {
    title: 'Premium Grills',
    body: 'Heavy-duty grills built for the edge-to-edge sear a thick ribeye actually needs.',
    href: 'https://rcsgasgrills.com/collections/bbq-grills',
    linkLabel: 'Browse grills',
    image: GrillImage,
  },
  {
    title: 'Kitchen Knives',
    body: 'Sharp, balanced blades — the difference between cutting a roast and fighting it.',
    href: 'https://cutleryandmore.com/collections/kitchen-knives-cutlery',
    linkLabel: 'Browse knives',
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

        <div className='grid grid-cols-1 gap-6'>
          {PARTNERS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 80}>
              <article className='group flex flex-col overflow-hidden rounded-xl border border-line bg-paper transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none sm:flex-row'>
                <div className='relative h-56 shrink-0 overflow-hidden sm:h-auto sm:min-h-65 sm:w-[42%]'>
                  <span className='absolute top-4 left-4 z-2 rounded-full bg-cream px-3 py-1 text-[10px] font-medium tracking-[0.15em] uppercase text-ink'>
                    Butcher&apos;s Pick
                  </span>
                  <Image
                    src={p.image}
                    alt=''
                    fill
                    sizes='(min-width: 640px) 42vw, 100vw'
                    className='object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100'
                  />
                </div>
                <div className='flex flex-1 flex-col justify-center px-7 pt-6 pb-7 sm:py-8 lg:px-10'>
                  <h3 className='mb-2.5 font-display text-[22px] leading-[1.2] tracking-[-0.015em] font-medium md:text-[26px]'>
                    {p.title}
                  </h3>
                  <p className='mb-5 max-w-[46ch] text-sm leading-relaxed text-ink-soft'>
                    {p.body}
                  </p>
                  <a
                    href={p.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 self-start border-b border-ink pb-0.5 text-[13px] font-medium tracking-[0.04em] text-ink transition-[gap,color] duration-300 hover:gap-3 hover:text-oxblood motion-reduce:transition-none'
                  >
                    {p.linkLabel}
                    <span className='sr-only'> (opens in new tab)</span>
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
