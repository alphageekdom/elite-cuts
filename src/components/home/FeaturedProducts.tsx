import Link from 'next/link';

import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import { CTA_ARROW } from '@/lib/styles';
import connectDB from '@/config/database';
import Reveal from '@/components/ui/Reveal';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { PRODUCT_CATEGORIES } from '@/lib/admin/constants';

import ProductCard from '@/components/product/ProductCard';

import SectionEyebrow from './SectionEyebrow';

// Mirror the admin/data set so the homepage category nav can't drift —
// every link routes to /products?category=<name> and the customer catalog
// page resolves each name back to a Mongo query. "Other" is an admin
// bucket, not a shopping invitation, so it stays off the marketing nav.
const CATEGORIES = PRODUCT_CATEGORIES.filter((c) => c !== 'Other');

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

  // No early return when nothing is featured — the hero's primary CTA
  // anchors to #featured, so the section keeps its category nav and
  // browse-all block and only the product grid drops out.

  return (
    <section
      id='featured'
      aria-labelledby='featured-products-heading'
      className='scroll-mt-24 bg-cream pt-35 pb-25'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow label='Featured Cuts' />
        </Reveal>

        <Reveal delayMs={80}>
          <div className='mb-12 flex flex-wrap items-end justify-between gap-12'>
            <h2
              id='featured-products-heading'
              className='max-w-[18ch] font-display text-[clamp(40px,5vw,68px)] leading-[1.05] tracking-tight font-normal'
            >
              The cuts our regulars{' '}
              <em className='font-normal italic text-oxblood'>
                keep coming back for.
              </em>
            </h2>
            <p className='max-w-[34ch] pb-2 text-[15px] leading-relaxed text-ink-soft'>
              A few counter favorites, cut fresh the day you pick them up. The
              lineup changes as the case does.
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={140}>
          <nav
            aria-label='Browse by category'
            className='mb-16 flex flex-wrap justify-center gap-2 sm:gap-2.5'
          >
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/products?category=${category}`}
                className='flex min-h-10 items-center justify-center rounded-full border border-line bg-cream px-3 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft transition-[background-color,border-color,color] duration-300 hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none sm:min-h-auto sm:px-5 sm:py-2 sm:text-[12px] sm:tracking-[0.16em]'
              >
                {category}
              </Link>
            ))}
          </nav>
        </Reveal>

        {serialized.length > 0 && (
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
            {serialized.map((product, i) => (
              <Reveal key={product._id} delayMs={200 + i * 70}>
                <ProductCard
                  product={product}
                  sizes='(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw'
                />
              </Reveal>
            ))}
          </div>
        )}

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
              Browse all cuts
              <ArrowIcon className={CTA_ARROW} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FeaturedProducts;
