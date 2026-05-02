import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import Reveal from '@/components/uielements/Reveal';

const CTA = () => {
  return (
    <section
      aria-labelledby='cta-heading'
      className='relative overflow-hidden bg-oxblood py-30 text-cream'
    >
      <span
        aria-hidden='true'
        className='pointer-events-none absolute -top-50 -right-50 h-150 w-150 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.2)_0%,transparent_60%)]'
      />

      <div className='relative z-2 mx-auto max-w-200 px-6 text-center'>
        <Reveal>
          <h2
            id='cta-heading'
            className='mb-8 font-display text-[clamp(44px,6vw,84px)] leading-[1.05] tracking-[-0.03em] font-normal'
          >
            Ready to find{' '}
            <em className='font-normal italic text-camel-soft'>your cut?</em>
          </h2>
          <p className='mx-auto mb-11 max-w-[50ch] text-[17px] opacity-85'>
            Order online, pick up at the shop. Or stop by and let us walk you
            through what came in fresh today.
          </p>
          <div className='inline-flex flex-wrap justify-center gap-4'>
            <Link
              href='/products'
              className='group/primary inline-flex items-center gap-2.5 rounded-full bg-cream px-8 py-4 text-sm font-medium tracking-[0.04em] text-ink transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-paper motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
            >
              Shop the counter
              <ArrowIcon className='transition-transform duration-300 group-hover/primary:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/primary:translate-x-0' />
            </Link>
            <Link
              href='#visit'
              className='inline-flex items-center rounded-full border border-cream/40 px-8 py-4 text-sm font-medium tracking-[0.04em] text-cream transition-[border-color,background-color] duration-300 hover:border-cream hover:bg-cream/5 motion-reduce:transition-none'
            >
              Visit the shop
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CTA;
