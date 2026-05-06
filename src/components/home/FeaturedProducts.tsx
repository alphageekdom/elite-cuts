import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import connectDB from '@/config/database';
import Reveal from '@/components/uielements/Reveal';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/utils/convertToObject';

import ProductCard from '@/components/product/ProductCard';

import SectionEyebrow from './SectionEyebrow';

// Match the Product schema enum exactly so the URL param flows straight
// through once category filtering lands on /products.
const CATEGORIES = ['Beef', 'Pork', 'Poultry', 'Lamb'] as const;

const FeaturedProducts = async () => {
  await connectDB();

  // .lean() returns plain objects for serialization across the
  // server/client boundary. Filter out featured products without an
  // image so the card never resolves to /images/products/undefined.
  const products = await Product.find({
    isFeatured: true,
    'images.0': { $exists: true },
  })
    .limit(4)
    .lean();
  const serialized = products.map(
    convertToSerializableObject,
  ) as SerializedProduct[];

  if (serialized.length === 0) return null;

  return (
    <section
      id='featured'
      aria-labelledby='featured-products-heading'
      className='scroll-mt-24 bg-cream pt-35 pb-25'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow label='Featured Products' />
        </Reveal>

        <Reveal delayMs={80}>
          <div className='mb-12 flex flex-wrap items-end justify-between gap-12'>
            <h2
              id='featured-products-heading'
              className='max-w-[18ch] font-display text-[clamp(40px,5vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal'
            >
              The cuts our regulars{' '}
              <em className='font-normal italic text-oxblood'>
                keep coming back for.
              </em>
            </h2>
            <p className='max-w-[34ch] pb-2 text-[15px] leading-relaxed text-ink-soft'>
              A small slice of the counter — what regulars keep ordering, week
              after week.
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={140}>
          <nav
            aria-label='Browse by category'
            className='mb-16 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2.5'
          >
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/products?category=${category}`}
                className='flex items-center justify-center rounded-full border border-line bg-cream px-2 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft transition-[background-color,border-color,color] duration-300 hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none sm:px-5 sm:py-2 sm:text-[12px] sm:tracking-[0.16em]'
              >
                {category}
              </Link>
            ))}
          </nav>
        </Reveal>

        <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
          {serialized.map((product, i) => (
            <Reveal key={product._id} delayMs={200 + i * 70}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={520}>
          <div className='mt-20 flex flex-wrap items-center justify-between gap-8 border-t border-line-soft pt-12'>
            <p className='max-w-[38ch] font-display text-[clamp(22px,2.2vw,30px)] leading-[1.3] tracking-[-0.015em] font-normal'>
              These are just a few of our cuts.{' '}
              <em className='font-normal italic text-oxblood'>
                Plenty more behind the counter.
              </em>
            </p>
            <Link
              href='/products'
              className='group/cta inline-flex shrink-0 items-center gap-3 rounded-full bg-ink px-8 py-4 text-sm font-medium tracking-[0.02em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-oxblood motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
            >
              Browse the full shop
              <ArrowIcon className='transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0' />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FeaturedProducts;
