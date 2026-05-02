import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import connectDB from '@/config/database';
import Reveal from '@/components/uielements/Reveal';
import Product from '@/models/Product';
import { convertToSerializableObject } from '@/utils/convertToObject';

import FeaturedProductCard, { type FeaturedProduct } from './FeaturedProductCard';
import SectionEyebrow from './SectionEyebrow';

const FeaturedProducts = async () => {
  await connectDB();

  // Limit to 2 for the editorial homepage grid; .lean() returns plain objects
  // for serialization across the server/client boundary. Filter out any
  // featured product without an image so the card never resolves to
  // /images/products/undefined.
  const products = await Product.find({
    isFeatured: true,
    'images.0': { $exists: true },
  })
    .limit(2)
    .lean();
  const serialized = products.map(convertToSerializableObject) as FeaturedProduct[];

  if (serialized.length === 0) return null;

  return (
    <section
      aria-labelledby='featured-products-heading'
      className='bg-cream pt-35 pb-25'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow num='03' label='Featured Products' />
        </Reveal>

        <Reveal delayMs={80}>
          <div className='mb-20 flex flex-wrap items-end justify-between gap-12'>
            <h2
              id='featured-products-heading'
              className='max-w-[18ch] font-display text-[clamp(40px,5vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal'
            >
              The cuts our regulars{' '}
              <em className='font-normal italic text-oxblood'>
                keep coming back for.
              </em>
            </h2>
            <p className='max-w-[32ch] pb-2 text-[15px] leading-relaxed text-ink-soft'>
              Two of our most-ordered cuts this month — straight from the case.
              Hand-cut to order.
            </p>
          </div>
        </Reveal>

        <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
          {serialized.map((product, i) => (
            <Reveal key={product._id} delayMs={160 + i * 80}>
              <FeaturedProductCard product={product} />
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={320}>
          <div className='mt-20 flex flex-wrap items-center justify-between gap-8 border-t border-line-soft pt-12'>
            <p className='max-w-[38ch] font-display text-[clamp(22px,2.2vw,30px)] leading-[1.3] tracking-[-0.015em] font-normal'>
              These are just the favorites.{' '}
              <em className='font-normal italic text-oxblood'>
                The full counter has plenty more.
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
