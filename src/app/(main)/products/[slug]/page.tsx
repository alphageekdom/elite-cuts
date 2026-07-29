import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import ProductModel, {
  type SerializedProduct,
  type ProductCategory,
} from '@/models/Product';
import ReviewModel from '@/models/Review';
import OrderModel from '@/models/Order';
import { resolveProductByParam } from '@/lib/products/resolve';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getSessionUser } from '@/lib/auth/session';
import ProductGallery from '@/components/product/detail/ProductGallery';
import RecentlyViewedTracker from '@/components/product/detail/RecentlyViewedTracker';
import BuyBlock from '@/components/product/detail/BuyBlock';
import Stars from '@/components/product/detail/Stars';
import ProductCard from '@/components/product/ProductCard';
import SectionHead from '@/components/ui/SectionHead';
import StoreInfoModal from '@/components/ui/StoreInfoModal';
import ChevronIcon from '@/components/uielements/ChevronIcon';
import StarIcon from '@/components/uielements/StarIcon';
import { CRUMB_CHEVRON } from '@/lib/styles';
import HolidayInlineNote from '@/components/holiday/HolidayInlineNote';
import { getHolidayForCut } from '@/lib/announcements/holidays';
import { getSpecCells } from '@/lib/products/spec';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { getShopHours } from '@/lib/shop-settings/hours-queries';
import { getPickupNote } from '@/lib/shop-settings/pickup-format';
import ReviewForm from './ReviewForm';
import ReviewList, { type DetailReview, type UserTier } from './ReviewList';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ slug: string }> };

type OwnReview = { _id: string; rating: number; comment: string };

type LeanReviewWithUser = {
  _id: Types.ObjectId;
  user: { _id: Types.ObjectId; name: string; rewardPoints: number } | null;
  authorNameSnapshot?: string;
  rating: number;
  comment: string;
  helpfulVoters?: Types.ObjectId[];
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveProductByParam(slug);
  // Resolve here rather than only in the page: metadata runs before the
  // streaming shell flushes, so the redirect/404 gets a real status code
  // instead of a 200 with a boundary rendered into it.
  if (resolved.kind === 'redirect')
    permanentRedirect(`/products/${resolved.slug}`);
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

const SERVING_NOTES = [
  {
    title: 'Serve at room temperature',
    desc: 'Bring it out 20–30 minutes ahead. Cold mutes the aroma and firms the fat.',
  },
  {
    title: 'Slice to order',
    desc: 'A sharp knife, as thin as you like. Cut only what you’ll serve — it keeps best whole.',
  },
  {
    title: 'Build a board',
    desc: 'Pairs with hard cheese, grainy mustard, cornichons, and crusty bread.',
  },
  {
    title: 'Store cold and wrapped',
    desc: 'Back in the fridge wrapped snug; best within a week of the first cut.',
  },
];

// Prep guidance is category-specific and only shown where a single honest note
// set applies to every product in that category. Raw cuts cooked with dry heat
// get the sear-and-rest steps; cured charcuterie is ready to eat and gets
// serving guidance instead. Mixed or pre-cooked categories (sausage, prepared,
// bundles, other) show nothing rather than instructions that would be wrong for
// half the products in them — searing prosciutto or resting a hot dog.
const PREP_NOTES: Partial<
  Record<ProductCategory, { heading: string; steps: typeof COOKING_NOTES }>
> = {
  Beef: { heading: 'Cooking notes', steps: COOKING_NOTES },
  Chicken: { heading: 'Cooking notes', steps: COOKING_NOTES },
  Pork: { heading: 'Cooking notes', steps: COOKING_NOTES },
  Lamb: { heading: 'Cooking notes', steps: COOKING_NOTES },
  Charcuterie: { heading: 'Serving notes', steps: SERVING_NOTES },
};

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getUserTier(pts: number): UserTier {
  if (pts >= 1000) return 'Master Cut';
  if (pts >= 250) return 'Connoisseur';
  return 'Regular';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Ceiling on the reviews fetched for client-side display + sorting. Summary
// stats are computed separately over all reviews, so this only bounds the
// interactive list, never the average / distribution / total count.
const REVIEW_DISPLAY_CAP = 200;

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  // Cached — shares the resolution generateMetadata already ran this request.
  const resolved = await resolveProductByParam(slug);
  if (resolved.kind === 'redirect')
    permanentRedirect(`/products/${resolved.slug}`);
  if (resolved.kind === 'notfound') notFound();

  await connectDB();
  const productId = String(resolved.doc._id);

  const product = convertToSerializableObject(
    resolved.doc,
  ) as SerializedProduct;

  const sessionUser = await getSessionUser();

  // Two independent review reads, run together:
  //  • ratingDocs — a projection over EVERY review (one rating number each,
  //    never serialized to the client) so the average, distribution, and total
  //    count stay accurate no matter how many reviews exist.
  //  • rawReviews — the capped, populated display list. The client sorts what
  //    it's handed, so REVIEW_DISPLAY_CAP bounds both the RSC payload and the
  //    populate round trip; past the cap the summary stats above stay honest
  //    while the list renders the most recent (unreachable at this scale).
  const [ratingDocs, rawReviewsRaw] = await Promise.all([
    ReviewModel.find({ product: productId })
      .select('rating')
      .lean<{ rating: number }[]>(),
    ReviewModel.find({ product: productId })
      .populate<{
        user: {
          _id: Types.ObjectId;
          name: string;
          rewardPoints: number;
        } | null;
      }>('user', 'name rewardPoints')
      .sort({ createdAt: -1 })
      .limit(REVIEW_DISPLAY_CAP)
      .lean(),
  ]);
  const totalReviews = ratingDocs.length;
  const rawReviews = rawReviewsRaw as unknown as LeanReviewWithUser[];

  // Verified-buyer set: which reviewers actually paid for THIS cut. One query
  // for all reviewers rather than a per-review check — distinct owner ids of
  // every paid order containing this product among the reviewers. `isPaid` is
  // the source of truth for a completed purchase; `distinct` collapses a
  // repeat buyer's many orders to a single id server-side.
  const reviewerIds = rawReviews
    .map((r) => r.user?._id)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const verifiedBuyerIds = new Set<string>();
  if (reviewerIds.length > 0) {
    const buyerIds = await OrderModel.distinct('user', {
      user: { $in: reviewerIds },
      isPaid: true,
      'orderItems.product': productId,
    }).lean<Types.ObjectId[]>();
    for (const id of buyerIds) verifiedBuyerIds.add(String(id));
  }

  const viewerId = sessionUser?.userId;

  const reviews: DetailReview[] = rawReviews.map((r) => {
    const snapshot = (r.authorNameSnapshot ?? '').trim();
    const fallbackName = snapshot || 'Former customer';
    const reviewerId = r.user?._id?.toString();
    const voters = r.helpfulVoters ?? [];
    return {
      _id: String(r._id),
      userId: reviewerId ?? 'anonymous',
      // Require a real viewer AND a matching author — otherwise a signed-out
      // visitor (viewerId undefined) would "own" every anonymized review
      // (reviewerId also undefined) and see its Delete control.
      isOwn: Boolean(viewerId) && reviewerId === viewerId,
      userName: r.user?.name ?? fallbackName,
      rating: r.rating,
      comment: r.comment,
      createdAtLabel: new Date(r.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAtMs: new Date(r.createdAt).getTime(),
      userTier: getUserTier(r.user?.rewardPoints ?? 0),
      isVerified: reviewerId ? verifiedBuyerIds.has(reviewerId) : false,
      helpfulCount: voters.length,
      viewerHasVoted: viewerId
        ? voters.some((v) => String(v) === viewerId)
        : false,
    };
  });

  // Derive the current user's own review for the edit form (no extra DB query).
  // Guarded on a real viewer so a signed-out visitor never matches an
  // anonymized review whose user id is also undefined.
  const ownRaw = viewerId
    ? rawReviews.find((r) => r.user?._id?.toString() === viewerId)
    : undefined;
  const ownReview: OwnReview | null = ownRaw
    ? {
        _id: String(ownRaw._id),
        rating: ownRaw.rating,
        comment: ownRaw.comment,
      }
    : null;

  // Rating stats — from the full projection, not the capped display list.
  const avgRating =
    totalReviews > 0
      ? ratingDocs.reduce((s, r) => s + r.rating, 0) / totalReviews
      : product.rating;

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = ratingDocs.filter((r) => r.rating === star).length;
    return {
      star,
      count,
      fraction: totalReviews > 0 ? count / totalReviews : 0,
    };
  });

  // Related products (same category, exclude current, in stock, limit 4)
  const relatedDocs = await ProductModel.find({
    category: product.category,
    _id: { $ne: productId },
    stockCount: { $gt: 0 },
  })
    .sort({ isFeatured: -1 })
    .limit(4)
    .lean();

  const related = relatedDocs.map(
    (d) =>
      convertToSerializableObject(
        d as Record<string, unknown>,
      ) as SerializedProduct,
  );

  const hasImages = product.images.length > 0;

  // Spec strip — Weight / Cut / Grade, all from real fields. Replaces the old
  // Category / Condition / Status / Arrival strip, where Status duplicated the
  // stock dot in the buy block and Arrival was a bare em-dash for most cuts.
  const specCells = getSpecCells(product);

  // Pickup copy from settings + hours, not hard-coded. `getShopSettings` /
  // `getShopHours` both dedupe within the request via React.cache.
  const [shopSettings, shopHours] = await Promise.all([
    getShopSettings(),
    getShopHours(),
  ]);
  const pickup = getPickupNote({
    days: shopHours,
    leadTime: shopSettings.leadTime,
    timezone: shopSettings.timezone,
    now: new Date(),
  });

  // Holiday match for this cut, if a window is active. Computed once and
  // passed into HolidayInlineNote so the date math doesn't run twice.
  const holidayMatch = getHolidayForCut(product.name);

  // Category-appropriate prep guidance, or null where no honest single note set
  // fits (see PREP_NOTES). Null hides the card and collapses the About grid.
  const prepNotes = PREP_NOTES[product.category] ?? null;

  return (
    <div className='bg-cream min-h-screen'>
      <RecentlyViewedTracker slug={product.slug} />
      <div className='mx-auto max-w-7xl px-5 md:px-8'>
        {/* ── Breadcrumb ── */}
        <nav
          aria-label='Breadcrumb'
          className='text-muted flex flex-wrap items-center gap-2 pt-7 pb-2 text-[12px] font-medium tracking-[0.04em] uppercase'
        >
          <Link
            href='/'
            className='hover:text-oxblood transition-colors duration-300'
          >
            Home
          </Link>
          <ChevronIcon direction='right' className={CRUMB_CHEVRON} />
          <Link
            href='/products'
            className='hover:text-oxblood transition-colors duration-300'
          >
            Shop
          </Link>
          <ChevronIcon direction='right' className={CRUMB_CHEVRON} />
          <Link
            href={`/products?category=${product.category}`}
            className='hover:text-oxblood transition-colors duration-300'
          >
            {product.category}
          </Link>
          <ChevronIcon direction='right' className={CRUMB_CHEVRON} />
          <span className='text-ink' aria-current='page'>
            {product.name}
          </span>
        </nav>

        {/* ── Product hero ── */}
        <section className='pt-6 pb-10 md:grid md:grid-cols-[1.2fr_1fr] md:items-start md:gap-10 lg:gap-16 lg:pt-10 lg:pb-16'>
          {/* Gallery */}
          {hasImages && (
            <div className='w-full'>
              <ProductGallery
                images={product.images}
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
            <div className='text-muted mb-4 flex flex-wrap items-center gap-2.5 text-[11px] font-medium tracking-[0.22em] uppercase'>
              <span>{product.category}</span>
              <span
                aria-hidden
                className='h-0.75 w-0.75 rounded-full bg-current opacity-40'
              />
              <span>{product.isAged ? 'Dry-Aged' : 'Fresh'}</span>
            </div>

            {/* Title */}
            <h1 className='font-display mb-5 text-[clamp(36px,4.5vw,52px)] leading-[1.05] font-normal tracking-tight'>
              {product.name.replace(/\.$/, '')}
              <em className='text-oxblood'>.</em>
            </h1>

            {/* Rating row */}
            {avgRating > 0 && (
              <div className='border-line-soft mb-6 flex flex-wrap items-center gap-3 border-b pb-6'>
                <Stars rating={avgRating} size='sm' />
                <span className='font-display text-lg font-medium'>
                  {avgRating.toFixed(1)}
                  <em className='text-muted ml-1 text-[13px] font-normal not-italic'>
                    /5
                  </em>
                </span>
                {totalReviews > 0 && (
                  <a
                    href='#reviews'
                    className='border-line text-ink-soft hover:border-oxblood hover:text-oxblood ml-auto border-b pb-px text-[12px] transition-colors duration-300'
                  >
                    {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </a>
                )}
              </div>
            )}

            {/* Tagline */}
            <p className='font-display text-ink-soft mb-8 max-w-[36ch] text-lg leading-relaxed font-normal italic'>
              &ldquo;{product.description.slice(0, 120).replace(/\.$/, '')}
              {product.description.length > 120 ? '…' : ''}&rdquo;
            </p>

            {/* Spec strip — Weight / Cut / Grade */}
            <div className='border-line-soft bg-line-soft mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-sm border'>
              {specCells.map(({ label, value }) => (
                <div key={label} className='bg-paper px-4 py-3.5'>
                  <div className='text-muted mb-1 text-[10px] font-medium tracking-[0.22em] uppercase'>
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
              <BuyBlock product={product} />
            </div>

            {/* Pickup info */}
            <div className='bg-cream-deep text-ink-soft flex items-start gap-3 rounded-sm px-5 py-4 text-[13px] leading-relaxed'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                aria-hidden
                className='text-oxblood mt-0.5 h-4 w-4 shrink-0'
              >
                <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
                <circle cx='12' cy='10' r='3' />
              </svg>
              <div>
                <strong className='text-ink font-medium'>Free pickup</strong> at
                our shop — ready in {pickup.readyIn}.
                <br />
                <span className='text-muted'>
                  {pickup.timing} · {shopSettings.city}, {shopSettings.state}
                </span>
              </div>
            </div>

            {/* Bulk / advance-order note — swaps to a holiday variant for matching cuts during an active window */}
            {holidayMatch ? (
              <HolidayInlineNote match={holidayMatch} />
            ) : (
              <p className='text-muted mt-3 px-1 text-[12px] leading-relaxed'>
                Need a larger order or want to reserve in advance?{' '}
                <StoreInfoModal /> — we&rsquo;ll take full payment up front and
                have your cut ready.
              </p>
            )}
          </aside>
        </section>

        {/* ── Description ── */}
        <section className='border-line-soft border-t py-14 md:py-20'>
          <SectionHead label='About this cut' />

          <h2 className='font-display mb-10 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-tight'>
            What makes <em className='text-oxblood'>this</em> cut.
          </h2>

          <div
            className={`grid gap-10 md:items-start md:gap-14 lg:gap-16 ${
              prepNotes ? 'md:grid-cols-[1.05fr_0.95fr]' : ''
            }`}
          >
            {/* Description body with drop cap */}
            <div className='text-ink-soft [&>p:first-of-type::first-letter]:font-display [&>p:first-of-type::first-letter]:text-oxblood text-[16px] leading-[1.75] md:max-w-[58ch] [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mt-1.5 [&>p:first-of-type::first-letter]:mr-3 [&>p:first-of-type::first-letter]:text-[56px] [&>p:first-of-type::first-letter]:leading-[0.9] [&>p:first-of-type::first-letter]:font-medium'>
              <p className='overflow-hidden'>{product.description}</p>
            </div>

            {/* Cooking / serving notes — category-appropriate, hidden where no
                single honest note set fits (see PREP_NOTES). */}
            {prepNotes && (
              <div className='border-line-soft bg-paper rounded-sm border p-8'>
                <h3 className='font-display text-oxblood mb-6 text-[22px] font-normal tracking-[-0.01em] italic'>
                  {prepNotes.heading}
                </h3>
                <div className='divide-line-soft divide-y'>
                  {prepNotes.steps.map(({ title, desc }, i) => (
                    <div
                      key={title}
                      className='flex gap-4 py-4 first:pt-0 last:pb-2'
                    >
                      <span className='text-muted mt-0.5 w-6 shrink-0 font-mono text-[12px]'>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className='font-display mb-1 text-[17px] font-medium tracking-[-0.005em]'>
                          {title}
                        </div>
                        <div className='text-ink-soft text-[14px] leading-[1.55]'>
                          {desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Reviews ── */}
        <section
          id='reviews'
          className='border-line-soft scroll-mt-24 border-t py-14 md:py-20'
        >
          <SectionHead label='Reviews' />

          <h2 className='font-display mb-10 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-tight'>
            What regulars are <em className='text-oxblood'>saying.</em>
          </h2>

          {totalReviews === 0 ? (
            // Empty state — single centered card; no bare distribution bars / wide gap
            <div className='border-line bg-paper rounded-sm border border-dashed px-6 py-16 text-center md:px-10 md:py-20'>
              <div className='bg-cream-deep text-ink-soft mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full'>
                <StarIcon className='h-3.5 w-3.5' />
              </div>
              <h3 className='font-display mb-2 text-[24px] font-medium tracking-[-0.01em] md:text-[26px]'>
                No reviews yet
              </h3>
              <p className='text-muted mx-auto max-w-[36ch] text-[14px] leading-[1.6]'>
                Be the first to share your experience with this cut.
              </p>
            </div>
          ) : (
            <div className='grid gap-10 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] lg:gap-16'>
              {/* Rating summary */}
              <div className='border-line-soft bg-paper rounded-sm border p-6 md:self-start md:p-7 lg:p-8'>
                <div className='border-line-soft mb-6 border-b pb-6'>
                  <div className='font-display mb-2 text-[64px] leading-none font-normal tracking-[-0.03em]'>
                    {avgRating.toFixed(1)}
                    <em className='text-muted ml-1 text-3xl font-normal not-italic'>
                      /5
                    </em>
                  </div>
                  <Stars rating={avgRating} size='md' />
                  <p className='text-muted mt-2 text-[13px]'>
                    Based on {totalReviews}{' '}
                    {totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {/* Distribution bars */}
                <div className='flex flex-col gap-2'>
                  {dist.map(({ star, count, fraction }) => (
                    <div
                      key={star}
                      className='text-ink-soft grid grid-cols-[18px_1fr_24px] items-center gap-2.5 text-[12px]'
                    >
                      <span className='text-camel-deep text-[11px]'>
                        {star}
                      </span>
                      <div className='bg-cream-deep h-1 overflow-hidden rounded-full'>
                        <div
                          className='bg-camel h-full rounded-full transition-[width] duration-700'
                          style={{ width: `${Math.round(fraction * 100)}%` }}
                        />
                      </div>
                      <span className='text-muted text-right font-mono text-[11px]'>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review list — sort, cap, helpful votes (client) */}
              <ReviewList
                reviews={reviews}
                totalReviews={totalReviews}
                viewerSignedIn={Boolean(viewerId)}
              />
            </div>
          )}

          <div className='border-line-soft mt-10 border-t pt-10 md:mt-14 md:pt-12'>
            <ReviewForm productId={productId} ownReview={ownReview} />
          </div>
        </section>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <section className='border-line-soft border-t py-14 md:py-20'>
            <SectionHead label='You might also like' />

            <h2 className='font-display mb-10 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-tight'>
              Other cuts <em className='text-oxblood'>worth knowing.</em>
            </h2>

            <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
              {related.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  sizes='(min-width: 1280px) 293px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
