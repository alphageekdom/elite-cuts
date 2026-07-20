import type { Metadata } from 'next';
import type { SortOrder } from 'mongoose';
import Link from 'next/link';

import connectDB from '@/config/database';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { paginateCatalog } from '@/lib/products/pagination';

import CatalogFilterBar from '@/components/product/CatalogFilterBar';
import CatalogHero from '@/components/product/CatalogHero';
import CatalogPagination from '@/components/product/CatalogPagination';
import ProductCard from '@/components/product/ProductCard';
import ResultsBar from '@/components/product/ResultsBar';
import HolidayBanner from '@/components/holiday/HolidayBanner';
import GrillEventBanner from '@/components/grill-event/GrillEventBanner';
import { getActiveEvent } from '@/lib/events/queries';
import {
  PAGE_SIZE,
  isCategoryFilter,
  isSortValue,
  type SortValue,
} from '@/components/product/catalogConfig';

export const metadata: Metadata = {
  title: 'The Counter',
  // Deliberately doesn't enumerate categories — the list has changed twice and
  // the on-page chips are the source of truth for what's actually in the case.
  description:
    'Browse our full case — beef, pork, chicken, lamb, sausage and more, hand-cut to order and ready for same-day pickup.',
  alternates: { canonical: '/products' },
};

type SearchParams = {
  category?: string;
  q?: string;
  sort?: string;
  page?: string;
  inStock?: string;
};

const SORT_TO_MONGO: Record<SortValue, Record<string, SortOrder>> = {
  // isFeatured first, then newest within each bucket; stable secondary _id sort
  // keeps pagination deterministic when scores tie.
  featured: { isFeatured: -1, createdAt: -1, _id: -1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const params = await searchParams;

  const category =
    params.category && isCategoryFilter(params.category) && params.category !== 'All'
      ? params.category
      : null;

  const sort: SortValue =
    params.sort && isSortValue(params.sort) ? params.sort : 'featured';

  const q = params.q?.trim() ?? '';

  // In-stock filter is on by default; users opt out with `?inStock=0`.
  const inStockOnly = params.inStock !== '0';

  const pageNum = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  // Every catalog read starts from the same visibility filter — has an image
  // and isn't soft-deleted. The per-category counts on the filter chips share
  // it so a chip can never advertise a count the listing won't show.
  const visible = { 'images.0': { $exists: true }, isActive: { $ne: false } };

  // Everything except the category constraint. Each chip's count is this
  // filter grouped by category, so a chip advertises exactly what clicking it
  // returns — including the in-stock toggle and any active search, which the
  // listing applies too.
  const baseQuery: Record<string, unknown> = { ...visible };
  if (inStockOnly) baseQuery.stockCount = { $gt: 0 };
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    baseQuery.$or = [{ name: pattern }, { description: pattern }];
  }

  const query: Record<string, unknown> = category
    ? { ...baseQuery, category }
    : baseQuery;

  await connectDB();

  // Total first: the page window has to be resolved before the listing query,
  // because `skip` is derived from the clamped page rather than the raw one.
  const total = await Product.countDocuments(query);
  const { totalPages, safePage, skip, start, end } = paginateCatalog(
    pageNum,
    total,
    PAGE_SIZE,
  );

  // Live stats use the unfiltered counts so the hero numbers stay stable as
  // the user filters/searches.
  const [
    productsRaw,
    totalAvailable,
    featuredCount,
    categoryCount,
    avgRating,
    categoryGroups,
    activeEvent,
  ] = await Promise.all([
    Product.find(query)
      .sort(SORT_TO_MONGO[sort])
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean(),
    // Hero stats share `visible` with the listing and the chip counts —
    // otherwise "Cuts available" could count a soft-deleted cut that no
    // chip and no page of results will ever show.
    Product.countDocuments({ ...visible, stockCount: { $gt: 0 } }),
    Product.countDocuments({ ...visible, isFeatured: true }),
    Product.distinct('category', visible).then((arr: string[]) => arr.length),
    // Case-wide rollup of the same rating each card already shows.
    Product.aggregate<{ _id: null; avg: number | null }>([
      { $match: visible },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]).then((rows) => rows[0]?.avg ?? 0),
    // One grouped pass for every chip count — never a query per chip.
    Product.aggregate<{ _id: string; count: number }>([
      { $match: baseQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    getActiveEvent(),
  ]);

  const categoryCounts: Record<string, number> = { All: 0 };
  for (const group of categoryGroups) {
    categoryCounts[group._id] = group.count;
    categoryCounts.All += group.count;
  }

  const products = productsRaw.map(
    convertToSerializableObject,
  ) as SerializedProduct[];


  const buildHref = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams();
    if (category) next.set('category', category);
    if (q) next.set('q', q);
    if (sort !== 'featured') next.set('sort', sort);
    if (!inStockOnly) next.set('inStock', '0');
    if (safePage > 1) next.set('page', String(safePage));
    mutate(next);
    const qs = next.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  // In-stock is a visible toggle in the results bar rather than a removable
  // chip, so it's discoverable before it's active — it stays out of the
  // active-filter chip list.
  const inStockHref = buildHref((p) => {
    if (inStockOnly) p.set('inStock', '0');
    else p.delete('inStock');
    p.delete('page');
  });

  // Recovery action on the empty state — drops category, search and the
  // in-stock restriction in one click while preserving the chosen sort.
  const clearFiltersHref = (() => {
    const next = new URLSearchParams();
    if (sort !== 'featured') next.set('sort', sort);
    next.set('inStock', '0');
    return `/products?${next.toString()}`;
  })();

  const activeFilters: { label: string; removeHref: string }[] = [];
  if (category) {
    activeFilters.push({
      label: category,
      removeHref: buildHref((p) => {
        p.delete('category');
        p.delete('page');
      }),
    });
  }
  if (q) {
    activeFilters.push({
      label: `“${q}”`,
      removeHref: buildHref((p) => {
        p.delete('q');
        p.delete('page');
      }),
    });
  }

  const hrefForPage = (target: number) =>
    buildHref((p) => {
      if (target <= 1) p.delete('page');
      else p.set('page', String(target));
    });

  const stats = [
    { value: String(totalAvailable), label: 'Cuts available' },
    { value: String(categoryCount), label: 'Categories' },
    { value: String(featuredCount), label: 'Featured' },
    // A real number rather than a slogan: the other three cells are computed,
    // and "cut fresh daily" already appears in the subhead directly above.
    { value: avgRating > 0 ? avgRating.toFixed(1) : '—', label: 'Avg rating' },
  ] as const;

  return (
    <>
      <CatalogHero stats={stats} />
      <div className='space-y-2 bg-cream'>
        {activeEvent && <GrillEventBanner event={activeEvent} />}
        <HolidayBanner activeEvent={activeEvent} />
      </div>
      <CatalogFilterBar categoryCounts={categoryCounts} />
      <section className='bg-cream pb-25'>
        <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
          {/* The hero's h1 is followed only by each card's h3, so heading
              navigation skips a level without this. */}
          <h2 className='sr-only'>The case</h2>
          <ResultsBar
            start={start}
            end={end}
            total={total}
            activeFilters={activeFilters}
            inStockOnly={inStockOnly}
            inStockHref={inStockHref}
          />

          {products.length === 0 ? (
            // Its own live region: the results-bar one renders empty at zero,
            // so without this the drop to no-results announces nothing at all.
            <div role='status' aria-atomic='true' className='py-24 text-center'>
              <p className='font-display text-2xl text-ink'>
                Nothing in the case matches that.
              </p>
              <p className='mt-2 text-[14px] text-muted'>
                Try a different cut, or start over with the full case.
              </p>
              <Link
                href={clearFiltersHref}
                scroll={false}
                className='mt-6 inline-flex items-center rounded-full bg-oxblood px-5 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none'
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <CatalogPagination
            page={safePage}
            totalPages={totalPages}
            hrefForPage={hrefForPage}
          />
        </div>
      </section>
    </>
  );
};

export default ProductsPage;
