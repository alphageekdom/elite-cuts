'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import HeroBg from '@/assets/images/hero-butcher.jpg';

const CATEGORIES = ['All', 'Beef', 'Pork', 'Poultry', 'Specialty'] as const;
type Category = (typeof CATEGORIES)[number];

const Hero = () => {
  const [product, setProduct] = useState('');
  const [productType, setProductType] = useState<Category>('All');
  const router = useRouter();

  return (
    // -mt-20 cancels the layout's pt-20 so the hero sits *under* the
    // transparent navbar; pt-30 + min-h-screen reserves space for it inside.
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

      <div className='relative z-1 mx-auto w-full max-w-7xl px-6 md:px-8'>
        <div className='mb-7 flex animate-[heroRise_0.7s_ease_both_0.1s] items-center gap-3 text-xs font-medium tracking-[0.22em] uppercase motion-reduce:animate-none'>
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

        <p className='mb-11 max-w-[44ch] animate-[heroRise_0.8s_ease_both_0.42s] text-[17px] leading-relaxed text-cream/90 motion-reduce:animate-none'>
          A modernized butcher shop combining traditional cuts with sustainably
          sourced, ethically raised meat — and a seamless way to order.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = product.trim();
            if (trimmed === '' && productType === 'All') {
              router.push('/products');
              return;
            }
            const params = new URLSearchParams({
              product: trimmed,
              productType,
            });
            router.push(`/products/search-results?${params.toString()}`);
          }}
          role='search'
          aria-label='Product search'
          className='flex w-full max-w-155 flex-wrap items-center gap-2 rounded-2xl bg-paper/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-[heroRise_0.8s_ease_both_0.5s] motion-reduce:animate-none md:flex-nowrap md:gap-0 md:rounded-full md:py-2 md:pr-2 md:pl-7'
        >
          <label htmlFor='hero-product' className='sr-only'>
            Search for cuts
          </label>
          <input
            id='hero-product'
            type='text'
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder='Search ribeye, brisket, dry-aged…'
            className='w-full flex-1 bg-transparent px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted md:w-auto md:px-0 md:py-3.5'
          />
          <label htmlFor='hero-product-type' className='sr-only'>
            Product category
          </label>
          <select
            id='hero-product-type'
            value={productType}
            onChange={(e) => setProductType(e.target.value as Category)}
            className='w-full cursor-pointer bg-transparent px-4 py-2.5 text-sm text-ink-soft outline-none md:w-auto md:border-l md:border-line md:py-0'
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All cuts' : c}
              </option>
            ))}
          </select>
          <button
            type='submit'
            className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-oxblood px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-cream transition-colors hover:bg-oxblood-deep motion-reduce:transition-none md:w-auto'
          >
            Search
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
          </button>
        </form>
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
        <span>34.0522° N · 118.2437° W</span>
      </div>
    </section>
  );
};

export default Hero;
