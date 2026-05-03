import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import ProductModel, { type SerializedProduct } from '@/models/Product';
import ReviewModel from '@/models/Review';
import { convertToSerializableObject } from '@/utils/convertToObject';
import ProductGallery from '@/components/product/detail/ProductGallery';
import BuyBlock from '@/components/product/detail/BuyBlock';
import ProductCard from '@/components/product/ProductCard';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

type SerializedReview = {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type LeanReviewWithUser = {
  _id: Types.ObjectId;
  user: { name: string } | null;
  rating: number;
  comment: string;
  createdAt: Date;
};

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { id } = await params;
  const product = await ProductModel.findById(id).select('name description').lean();
  if (!product) return { title: 'Product Not Found — EliteCuts' };
  return {
    title: `${product.name} — EliteCuts`,
    description: product.description.slice(0, 155),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const StarIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden
    className='h-3.5 w-3.5'
  >
    <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
  </svg>
);

const ChevronRight = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden
    className='h-2.5 w-2.5 opacity-50'
  >
    <polyline points='9 18 15 12 9 6' />
  </svg>
);

function SectionHead({
  num,
  label,
}: {
  num: string;
  label: string;
}) {
  return (
    <div className='mb-12 flex items-baseline gap-6'>
      <span className='font-display text-sm font-medium text-camel'>{num}</span>
      <span className='text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
        {label}
      </span>
      <span className='h-px flex-1 bg-line' aria-hidden />
    </div>
  );
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const full = Math.round(rating);
  return (
    <div className='flex gap-0.5 text-camel' aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox='0 0 24 24'
          fill={i < full ? 'currentColor' : 'none'}
          stroke='currentColor'
          strokeWidth={i < full ? 0 : 1.5}
          aria-hidden
          className={sizes[size]}
        >
          <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
        </svg>
      ))}
    </div>
  );
}

const COOKING_NOTES = [
  {
    title: 'Bring to room temp',
    desc: 'Take the cut out 30–45 minutes before cooking. Cold meat sears unevenly.',
  },
  {
    title: 'Season generously',
    desc: 'Coarse salt and pepper just before the heat. Let the meat speak.',
  },
  {
    title: 'Hot, dry heat',
    desc: 'Cast iron or a screaming hot grill. Patience on the first side builds the crust.',
  },
  {
    title: 'Rest before cutting',
    desc: 'Five minutes minimum. The juices redistribute — this step earns the price.',
  },
];

// ─── Avatar initials helper ───────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  'bg-camel text-cream',
  'bg-oxblood text-cream',
  'bg-ink text-cream',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  await connectDB();
  const { id } = await params;

  const productDoc = await ProductModel.findById(id).lean();
  if (!productDoc) notFound();

  const product = convertToSerializableObject(
    productDoc as Record<string, unknown>,
  ) as SerializedProduct;

  // Reviews (populate user.name)
  const rawReviews = (await ReviewModel.find({ product: id })
    .populate<{ user: { name: string } | null }>('user', 'name')
    .sort({ createdAt: -1 })
    .lean()) as LeanReviewWithUser[];

  const reviews: SerializedReview[] = rawReviews.map((r) => ({
    _id: String(r._id),
    userName:
      r.user && 'name' in r.user ? String(r.user.name) : 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    createdAt: new Date(r.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }));

  // Rating stats
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : product.rating;

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return { star, count, fraction: reviews.length > 0 ? count / reviews.length : 0 };
  });

  // Related products (same category, exclude current, in stock, limit 3)
  const relatedDocs = await ProductModel.find({
    category: product.category,
    _id: { $ne: id },
    stockCount: { $gt: 0 },
  })
    .sort({ isFeatured: -1 })
    .limit(3)
    .lean();

  const related = relatedDocs.map(
    (d) => convertToSerializableObject(d as Record<string, unknown>) as SerializedProduct,
  );

  const primaryImage = product.images[0] ?? '';

  // Sourcing display cells
  const sourcingCells = [
    { label: 'Category', value: product.category },
    { label: 'Condition', value: product.isAged ? 'Dry-Aged' : 'Fresh' },
    { label: 'Status', value: product.stockCount > 0 ? 'In Stock' : 'Out of Stock' },
    { label: 'Arrival', value: product.isNewArrival ? 'New' : '—' },
  ];

  return (
    <div className='bg-cream min-h-screen'>
      <div className='mx-auto max-w-7xl px-5 md:px-8'>

        {/* ── Breadcrumb ── */}
        <nav
          aria-label='Breadcrumb'
          className='flex flex-wrap items-center gap-2 pt-7 pb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted'
        >
          <Link href='/' className='transition-colors duration-300 hover:text-oxblood'>
            Home
          </Link>
          <ChevronRight />
          <Link href='/products' className='transition-colors duration-300 hover:text-oxblood'>
            Shop
          </Link>
          <ChevronRight />
          <Link
            href={`/products?category=${product.category}`}
            className='transition-colors duration-300 hover:text-oxblood'
          >
            {product.category}
          </Link>
          <ChevronRight />
          <span className='text-ink'>{product.name}</span>
        </nav>

        {/* ── Product hero ── */}
        <section className='py-8 pb-20 lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-16'>

          {/* Gallery */}
          {primaryImage && (
            <ProductGallery
              image={primaryImage}
              name={product.name}
              isAged={product.isAged}
              isNewArrival={product.isNewArrival}
              isFeatured={product.isFeatured}
            />
          )}

          {/* Sticky info sidebar */}
          <aside className='mt-10 lg:sticky lg:top-24 lg:mt-0 lg:self-start'>

            {/* Meta */}
            <div className='mb-4 flex flex-wrap items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
              <span>{product.category}</span>
              <span
                aria-hidden
                className='h-0.75 w-0.75 rounded-full bg-current opacity-40'
              />
              <span>{product.isAged ? 'Dry-Aged' : 'Fresh'}</span>
            </div>

            {/* Title */}
            <h1 className='mb-5 font-display text-[clamp(36px,4.5vw,52px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              {product.name.replace(/\.$/, '')}
              <em className='text-oxblood'>.</em>
            </h1>

            {/* Rating row */}
            {avgRating > 0 && (
              <div className='mb-6 flex flex-wrap items-center gap-3 border-b border-line-soft pb-6'>
                <Stars rating={avgRating} size='sm' />
                <span className='font-display text-lg font-medium'>
                  {avgRating.toFixed(1)}
                  <em className='ml-1 text-[13px] font-normal not-italic text-muted'>
                    /5
                  </em>
                </span>
                {reviews.length > 0 && (
                  <a
                    href='#reviews'
                    className='ml-auto border-b border-line pb-px text-[12px] text-ink-soft transition-colors duration-300 hover:border-oxblood hover:text-oxblood'
                  >
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </a>
                )}
              </div>
            )}

            {/* Tagline */}
            <p className='mb-8 max-w-[36ch] font-display text-lg font-normal italic leading-relaxed text-ink-soft'>
              &ldquo;{product.description.slice(0, 120).replace(/\.$/, '')}
              {product.description.length > 120 ? '…' : ''}&rdquo;
            </p>

            {/* Sourcing mini-grid */}
            <div className='mb-8 grid grid-cols-2 overflow-hidden rounded-sm border border-line-soft bg-line-soft gap-px'>
              {sourcingCells.map(({ label, value }) => (
                <div key={label} className='bg-paper px-4 py-3.5'>
                  <div className='mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted'>
                    {label}
                  </div>
                  <div className='font-display text-base font-medium tracking-[-0.01em]'>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Buy block */}
            <div className='mb-4'>
              <BuyBlock
                product={{
                  _id: product._id,
                  price: product.price,
                  stockCount: product.stockCount,
                  name: product.name,
                }}
              />
            </div>

            {/* Pickup info */}
            <div className='flex items-start gap-3 rounded-sm bg-cream-deep px-5 py-4 text-[13px] leading-relaxed text-ink-soft'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                aria-hidden
                className='mt-0.5 h-4 w-4 flex-shrink-0 text-oxblood'
              >
                <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
                <circle cx='12' cy='10' r='3' />
              </svg>
              <div>
                <strong className='font-medium text-ink'>Free pickup</strong> at
                our shop — ready in about 1 hour.
                <br />
                <span className='text-muted'>
                  Order by 4 pm · Same-day pickup · North Park, San Diego
                </span>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Description ── */}
        <section className='border-t border-line-soft py-20'>
          <SectionHead num='02' label='About this cut' />

          <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.025em]'>
            What makes{' '}
            <em className='text-oxblood'>this</em> cut.
          </h2>

          <div className='grid gap-12 lg:grid-cols-2 lg:gap-16'>
            {/* Description body with drop cap */}
            <div className='prose-none text-[16px] leading-[1.75] text-ink-soft [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mr-3 [&>p:first-of-type::first-letter]:mt-1.5 [&>p:first-of-type::first-letter]:font-display [&>p:first-of-type::first-letter]:text-[56px] [&>p:first-of-type::first-letter]:font-medium [&>p:first-of-type::first-letter]:leading-[0.9] [&>p:first-of-type::first-letter]:text-oxblood'>
              <p>{product.description}</p>
            </div>

            {/* Cooking notes */}
            <div className='rounded-sm border border-line-soft bg-paper p-8'>
              <h3 className='mb-6 font-display text-[22px] font-normal italic tracking-[-0.01em] text-oxblood'>
                Cooking notes
              </h3>
              <div className='divide-y divide-line-soft'>
                {COOKING_NOTES.map(({ title, desc }, i) => (
                  <div key={title} className='flex gap-4 py-4 first:pt-0 last:pb-0'>
                    <span className='mt-0.5 w-6 flex-shrink-0 font-mono text-[12px] text-muted'>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className='mb-1 font-display text-[17px] font-medium tracking-[-0.005em]'>
                        {title}
                      </div>
                      <div className='text-[14px] leading-[1.55] text-ink-soft'>
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Reviews ── */}
        <section id='reviews' className='border-t border-line-soft py-20'>
          <SectionHead num='03' label='Reviews' />

          <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.025em]'>
            What regulars are <em className='text-oxblood'>saying.</em>
          </h2>

          <div className='grid gap-10 lg:grid-cols-[320px_1fr] lg:gap-16'>

            {/* Rating summary */}
            <div className='rounded-sm border border-line-soft bg-paper p-7 lg:p-8'>
              <div className='mb-6 border-b border-line-soft pb-6'>
                <div className='mb-2 font-display text-[64px] font-normal leading-none tracking-[-0.03em]'>
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                  <em className='ml-1 text-3xl font-normal not-italic text-muted'>
                    /5
                  </em>
                </div>
                <Stars rating={avgRating} size='md' />
                <p className='mt-2 text-[13px] text-muted'>
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Distribution bars */}
              <div className='flex flex-col gap-2'>
                {dist.map(({ star, count, fraction }) => (
                  <div key={star} className='grid grid-cols-[14px_1fr_28px] items-center gap-2.5 text-[12px] text-ink-soft'>
                    <span className='text-[11px] text-camel'>{star}</span>
                    <div className='h-1 overflow-hidden rounded-full bg-cream-deep'>
                      <div
                        className='h-full rounded-full bg-camel transition-[width] duration-700'
                        style={{ width: `${Math.round(fraction * 100)}%` }}
                      />
                    </div>
                    <span className='text-right font-mono text-[11px] text-muted'>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type='button'
                className='mt-6 w-full rounded-full bg-ink px-5 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
              >
                Write a review
              </button>
            </div>

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-sm border border-dashed border-line px-10 py-16 text-center'>
                <div className='mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-ink-soft'>
                  <StarIcon />
                </div>
                <h3 className='mb-2 font-display text-[22px] font-medium tracking-[-0.01em]'>
                  No reviews yet
                </h3>
                <p className='max-w-[32ch] text-[14px] text-muted'>
                  Be the first to share your experience with this cut.
                </p>
              </div>
            ) : (
              <div className='divide-y divide-line-soft'>
                {reviews.map((review, i) => {
                  const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
                  return (
                    <article key={review._id} className='py-7 first:pt-0 last:pb-0'>
                      <div className='mb-3.5 flex items-center gap-3.5'>
                        <div
                          className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full font-display text-[14px] font-medium ${colorClass}`}
                          aria-hidden
                        >
                          {initials(review.userName)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-[14px] font-medium'>{review.userName}</div>
                          <div className='mt-0.5 flex items-center gap-2 text-[11px] text-muted'>
                            <span className='inline-flex items-center gap-1 text-green'>
                              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={3} aria-hidden className='h-2.5 w-2.5'>
                                <polyline points='20 6 9 17 4 12' />
                              </svg>
                              Verified buyer
                            </span>
                            <span
                              aria-hidden
                              className='h-0.75 w-0.75 rounded-full bg-current opacity-50'
                            />
                            <span>{review.createdAt}</span>
                          </div>
                        </div>
                        <Stars rating={review.rating} size='sm' />
                      </div>
                      <p className='text-[14px] leading-[1.65] text-ink-soft'>
                        {review.comment}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <section className='border-t border-line-soft py-20'>
            <SectionHead num='04' label='You might also like' />

            <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              Other cuts <em className='text-oxblood'>worth knowing.</em>
            </h2>

            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
