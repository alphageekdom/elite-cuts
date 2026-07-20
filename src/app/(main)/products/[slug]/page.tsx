import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import ProductModel, { type SerializedProduct } from '@/models/Product';
import ReviewModel from '@/models/Review';
import { resolveProductByParam } from '@/lib/products/resolve';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getSessionUser } from '@/lib/auth/session';
import { AVATAR_COLORS, MEMBER_AVATAR_COLORS } from '@/lib/admin/constants';
import { avatarColorForId } from '@/lib/format';
import ProductGallery from '@/components/product/detail/ProductGallery';
import BuyBlock from '@/components/product/detail/BuyBlock';
import ProductCard from '@/components/product/ProductCard';
import SectionHead from '@/components/ui/SectionHead';
import StoreInfoModal from '@/components/ui/StoreInfoModal';
import HolidayInlineNote from '@/components/holiday/HolidayInlineNote';
import { getHolidayForCut } from '@/lib/announcements/holidays';
import ReviewForm from './ReviewForm';
import ReviewActions from './ReviewActions';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ slug: string }> };

type UserTier = 'Master Cut' | 'Connoisseur' | 'Regular';

type OwnReview = { _id: string; rating: number; comment: string };

type SerializedReview = {
  _id: string;
  userId: string;
  isOwn: boolean;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  userTier: UserTier;
};

type LeanReviewWithUser = {
  _id: Types.ObjectId;
  user: { _id: Types.ObjectId; name: string; rewardPoints: number } | null;
  authorNameSnapshot?: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

// ─── Metadata ────────────────────────────────────────────────────────────────

// Trim to snippet length at a word boundary so search results never show a
// description cut mid-word.
const trimDescription = (text: string, max = 155): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveProductByParam(slug);
  // Resolve here rather than only in the page: metadata runs before the
  // streaming shell flushes, so the redirect/404 gets a real status code
  // instead of a 200 with a boundary rendered into it.
  if (resolved.kind === 'redirect') permanentRedirect(`/products/${resolved.slug}`);
  if (resolved.kind === 'notfound') notFound();

  const name = resolved.doc.name as string;
  const description = resolved.doc.description as string;
  return {
    title: name,
    description: trimDescription(description),
    alternates: { canonical: `/products/${slug}` },
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


function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const full = Math.round(rating);
  return (
    <div className='flex gap-0.5 text-camel-deep' aria-label={`${rating.toFixed(1)} out of 5 stars`}>
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

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getUserTier(pts: number): UserTier {
  if (pts >= 1000) return 'Master Cut';
  if (pts >= 250) return 'Connoisseur';
  return 'Regular';
}

const TIER_PILL: Partial<Record<UserTier, { label: string; cls: string }>> = {
  'Master Cut':  { label: 'Master Cut',  cls: 'bg-oxblood/10 text-oxblood' },
  'Connoisseur': { label: 'Connoisseur', cls: 'bg-camel/15 text-camel-deep'     },
};

// ─── Avatar initials helper ───────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  // Cached — shares the resolution generateMetadata already ran this request.
  const resolved = await resolveProductByParam(slug);
  if (resolved.kind === 'redirect') permanentRedirect(`/products/${resolved.slug}`);
  if (resolved.kind === 'notfound') notFound();

  await connectDB();
  const productId = String(resolved.doc._id);

  const product = convertToSerializableObject(
    resolved.doc,
  ) as SerializedProduct;

  const sessionUser = await getSessionUser();

  // Reviews (populate user name + rewardPoints; _id included by default)
  const rawReviews = (await ReviewModel.find({ product: productId })
    .populate<{ user: { _id: Types.ObjectId; name: string; rewardPoints: number } | null }>('user', 'name rewardPoints')
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanReviewWithUser[];

  const reviews: SerializedReview[] = rawReviews.map((r) => {
    const snapshot = (r.authorNameSnapshot ?? '').trim();
    const fallbackName = snapshot || 'Former customer';
    return {
      _id: String(r._id),
      userId: r.user?._id?.toString() ?? 'anonymous',
      isOwn: r.user?._id?.toString() === sessionUser?.userId,
      userName: r.user?.name ?? fallbackName,
      rating: r.rating,
      comment: r.comment,
      createdAt: new Date(r.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      userTier: getUserTier(r.user?.rewardPoints ?? 0),
    };
  });

  // Derive the current user's own review for the edit form (no extra DB query)
  const ownRaw = reviews.find((r) => r.isOwn);
  const ownReview: OwnReview | null = ownRaw
    ? { _id: ownRaw._id, rating: ownRaw.rating, comment: ownRaw.comment }
    : null;

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
    _id: { $ne: productId },
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

  // Holiday match for this cut, if a window is active. Computed once and
  // passed into HolidayInlineNote so the date math doesn't run twice.
  const holidayMatch = getHolidayForCut(product.name);

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
        <section className='pt-6 pb-10 md:grid md:grid-cols-[1.2fr_1fr] md:items-start md:gap-10 lg:gap-16 lg:pb-16 lg:pt-10'>

          {/* Gallery */}
          {primaryImage && (
            <div className='w-full'>
              <ProductGallery
                image={primaryImage}
                name={product.name}
                isAged={product.isAged}
                isNewArrival={product.isNewArrival}
                isFeatured={product.isFeatured}
              />
            </div>
          )}

          {/* Sticky info sidebar */}
          <aside className='mt-8 md:sticky md:top-24 md:mt-0 md:self-start'>

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
            <h1 className='mb-5 font-display text-[clamp(36px,4.5vw,52px)] font-normal leading-[1.05] tracking-tight'>
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
                  images: product.images,
                  category: product.category,
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
                className='mt-0.5 h-4 w-4 shrink-0 text-oxblood'
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

            {/* Bulk / advance-order note — swaps to a holiday variant for matching cuts during an active window */}
            {holidayMatch ? (
              <HolidayInlineNote match={holidayMatch} />
            ) : (
              <p className='mt-3 px-1 text-[12px] leading-relaxed text-muted'>
                Need a larger order or want to reserve in advance?{' '}
                <StoreInfoModal />{' '}
                — we&rsquo;ll take full payment up front and have your cut ready.
              </p>
            )}
          </aside>
        </section>

        {/* ── Description ── */}
        <section className='border-t border-line-soft py-14 md:py-20'>
          <SectionHead label='About this cut' />

          <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-tight'>
            What makes{' '}
            <em className='text-oxblood'>this</em> cut.
          </h2>

          <div className='grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-start md:gap-14 lg:gap-16'>
            {/* Description body with drop cap */}
            <div className='text-[16px] leading-[1.75] text-ink-soft [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mr-3 [&>p:first-of-type::first-letter]:mt-1.5 [&>p:first-of-type::first-letter]:font-display [&>p:first-of-type::first-letter]:text-[56px] [&>p:first-of-type::first-letter]:font-medium [&>p:first-of-type::first-letter]:leading-[0.9] [&>p:first-of-type::first-letter]:text-oxblood md:max-w-[58ch]'>
              <p className='overflow-hidden'>{product.description}</p>
            </div>

            {/* Cooking notes */}
            <div className='rounded-sm border border-line-soft bg-paper p-8'>
              <h3 className='mb-6 font-display text-[22px] font-normal italic tracking-[-0.01em] text-oxblood'>
                Cooking notes
              </h3>
              <div className='divide-y divide-line-soft'>
                {COOKING_NOTES.map(({ title, desc }, i) => (
                  <div key={title} className='flex gap-4 py-4 first:pt-0 last:pb-2'>
                    <span className='mt-0.5 w-6 shrink-0 font-mono text-[12px] text-muted'>
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
        <section id='reviews' className='border-t border-line-soft py-14 md:py-20'>
          <SectionHead label='Reviews' />

          <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-tight'>
            What regulars are <em className='text-oxblood'>saying.</em>
          </h2>

          {reviews.length === 0 ? (
            // Empty state — single centered card; no bare distribution bars / wide gap
            <div className='rounded-sm border border-dashed border-line bg-paper px-6 py-16 text-center md:px-10 md:py-20'>
              <div className='mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-ink-soft'>
                <StarIcon />
              </div>
              <h3 className='mb-2 font-display text-[24px] font-medium tracking-[-0.01em] md:text-[26px]'>
                No reviews yet
              </h3>
              <p className='mx-auto max-w-[36ch] text-[14px] leading-[1.6] text-muted'>
                Be the first to share your experience with this cut.
              </p>
            </div>
          ) : (
            <div className='grid gap-10 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] lg:gap-16'>

              {/* Rating summary */}
              <div className='rounded-sm border border-line-soft bg-paper p-6 md:p-7 lg:p-8 md:self-start'>
                <div className='mb-6 border-b border-line-soft pb-6'>
                  <div className='mb-2 font-display text-[64px] font-normal leading-none tracking-[-0.03em]'>
                    {avgRating.toFixed(1)}
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
                    <div key={star} className='grid grid-cols-[18px_1fr_24px] items-center gap-2.5 text-[12px] text-ink-soft'>
                      <span className='text-[11px] text-camel-deep'>{star}</span>
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

              </div>

              {/* Review list */}
              <div className='divide-y divide-line-soft'>
                {reviews.map((review) => {
                  const isMember = review.userTier !== 'Regular';
                  const colorClass = avatarColorForId(
                    review.userId,
                    isMember ? MEMBER_AVATAR_COLORS : AVATAR_COLORS,
                  );
                  return (
                    <article key={review._id} className='py-7 first:pt-0 last:pb-0'>
                      <div className='mb-3.5 flex items-center gap-3.5'>
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[14px] font-medium ${colorClass}`}
                          aria-hidden
                        >
                          {initials(review.userName)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-1.5 text-[14px] font-medium'>
                            {review.userName}
                            {TIER_PILL[review.userTier] && (
                              <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase ${TIER_PILL[review.userTier]?.cls}`}
                              >
                                {TIER_PILL[review.userTier]?.label}
                              </span>
                            )}
                          </div>
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
                      {review.isOwn && <ReviewActions reviewId={review._id} />}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className='mt-10 border-t border-line-soft pt-10 md:mt-14 md:pt-12'>
            <ReviewForm productId={productId} ownReview={ownReview} />
          </div>
        </section>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <section className='border-t border-line-soft py-14 md:py-20'>
            <SectionHead label='You might also like' />

            <h2 className='mb-10 font-display text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-tight'>
              Other cuts <em className='text-oxblood'>worth knowing.</em>
            </h2>

            <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
              {related.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  sizes='(min-width: 1280px) 389px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
