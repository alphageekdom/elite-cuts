import Image from 'next/image';
import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import HeroBg from '@/assets/images/hero-butcher.jpg';

const Hero = () => {
  return (
    // -mt-20 cancels the layout's pt-20 so the hero sits *under* the
    // transparent navbar; pt-30 + min-h reserves space for it inside.
    <section className='relative -mt-20 flex min-h-[clamp(640px,100vh,960px)] items-center overflow-hidden pt-30 pb-16 text-cream'>
      <div className='absolute inset-0 -z-10 scale-105 animate-[heroZoom_20s_ease-in-out_infinite_alternate] motion-reduce:animate-none'>
        <Image
          src={HeroBg}
          alt=''
          fill
          priority
          sizes='100vw'
          className='object-cover'
        />
      </div>
      <div
        aria-hidden='true'
        className='absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,16,14,0.55)_0%,rgba(20,16,14,0.4)_40%,rgba(20,16,14,0.7)_100%)]'
      />
      <div
        aria-hidden='true'
        className='absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_50%,rgba(20,16,14,0.5)_0%,transparent_60%)]'
      />

      <div className='relative z-1 mx-auto w-full max-w-7xl px-6 md:px-8'>
        <div className='mb-7 flex animate-[heroRise_0.7s_ease_both_0.1s] items-center gap-3 text-xs font-medium tracking-[0.16em] uppercase motion-reduce:animate-none'>
          <span aria-hidden='true' className='h-px w-7 bg-current opacity-60' />
          Established 2018 · Southern California
        </div>

        <h1 className='mb-9 max-w-[14ch] font-display text-[clamp(54px,8.5vw,132px)] leading-[0.95] tracking-[-0.035em] font-normal'>
          <span className='inline-block animate-[heroRise_0.8s_ease_both_0.18s] motion-reduce:animate-none'>
            The
          </span>{' '}
          <span className='inline-block animate-[heroRise_0.8s_ease_both_0.26s] motion-reduce:animate-none'>
            <em className='font-light text-camel-soft'>art</em>
          </span>{' '}
          <span className='inline-block animate-[heroRise_0.8s_ease_both_0.34s] motion-reduce:animate-none'>
            of the cut.
          </span>
        </h1>

        <p className='mb-10 max-w-[44ch] animate-[heroRise_0.8s_ease_both_0.42s] text-[18px] leading-relaxed text-cream/90 motion-reduce:animate-none'>
          Hand-cut beef, pork, poultry, and lamb — pasture-raised, dry-aged
          in-house, and butchered to order. Ready when you are.
        </p>

        <div className='flex animate-[heroRise_0.8s_ease_both_0.5s] flex-wrap items-center gap-3 motion-reduce:animate-none sm:gap-4'>
          <Link
            href='#featured'
            className='group/cta inline-flex items-center justify-center gap-2.5 rounded-full bg-oxblood px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-oxblood-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40 motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
          >
            Shop best sellers
            <ArrowIcon className='transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0' />
          </Link>
          <Link
            href='/products'
            className='inline-flex items-center justify-center gap-2.5 rounded-full border border-cream/60 px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-cream transition-[background-color,border-color,color] duration-300 hover:border-cream hover:bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40 motion-reduce:transition-none'
          >
            Browse all cuts
          </Link>
        </div>

        <p className='mt-7 animate-[heroRise_0.8s_ease_both_0.58s] text-[12px] font-medium tracking-[0.18em] uppercase text-cream/75 motion-reduce:animate-none'>
          Order by 4pm · Same-day pickup
        </p>
      </div>

      <div className='absolute right-0 bottom-10 left-0 z-1 mx-auto hidden w-full max-w-7xl items-end justify-between px-6 text-xs tracking-[0.18em] uppercase opacity-70 md:flex md:px-8'>
        <span>EC · 01</span>
        <span className='flex items-center gap-3'>
          Scroll
          <span className='relative h-10 w-px overflow-hidden bg-current'>
            <span
              aria-hidden='true'
              className='absolute inset-0 animate-[heroScrollPulse_2s_ease-in-out_infinite] bg-camel motion-reduce:animate-none'
            />
          </span>
        </span>
        <span>32.7491° N · 117.1294° W</span>
      </div>
    </section>
  );
};

export default Hero;
