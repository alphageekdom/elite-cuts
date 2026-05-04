import type { Metadata } from 'next';
import type { SortOrder } from 'mongoose';

import connectDB from '@/config/database';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/utils/convertToObject';

import CatalogFilterBar from '@/components/product/CatalogFilterBar';
import CatalogHero from '@/components/product/CatalogHero';
import CatalogPagination from '@/components/product/CatalogPagination';
import ProductCard from '@/components/product/ProductCard';
import ResultsBar from '@/components/product/ResultsBar';
import {
  PAGE_SIZE,
  isCategoryFilter,
  isSortValue,
  type SortValue,
} from '@/components/product/catalogConfig';

export const metadata: Metadata = {
  title: 'The Counter — EliteCuts',
  description:
    'Browse our full case — beef, pork, poultry, lamb and charcuterie, hand-cut to order and ready for same-day pickup.',
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

  const query: Record<string, unknown> = { 'images.0': { $exists: true } };
  if (category) query.category = category;
  if (inStockOnly) query.stockCount = { $gt: 0 };
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    query.$or = [{ name: pattern }, { description: pattern }];
  }

  await connectDB();

  // Live stats use the unfiltered counts so the hero numbers stay stable as
  // the user filters/searches.
  const [total, productsRaw, totalAvailable, lowStock, featuredCount, categoryCount] =
    await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .sort(SORT_TO_MONGO[sort])
        .skip((pageNum - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Product.countDocuments({ stockCount: { $gt: 0 } }),
      Product.countDocuments({ stockCount: { $gt: 0, $lte: 5 } }),
      Product.countDocuments({ isFeatured: true }),
      Product.distinct('category').then((arr: string[]) => arr.length),
    ]);

  const products = productsRaw.map(
    convertToSerializableObject,
  ) as SerializedProduct[];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, total);

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

  const activeFilters: { label: string; removeHref: string }[] = [];
  if (inStockOnly) {
    activeFilters.push({
      label: 'In stock',
      removeHref: buildHref((p) => {
        p.set('inStock', '0');
        p.delete('page');
      }),
    });
  }
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
    { value: String(lowStock), label: 'Low stock' },
  ] as const;

  return (
    <>
      <CatalogHero stats={stats} />
      <CatalogFilterBar />
      <section className='bg-cream pb-25'>
        <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
          <ResultsBar
            start={start}
            end={end}
            total={total}
            activeFilters={activeFilters}
          />

          {products.length === 0 ? (
            <div className='py-24 text-center'>
              <p className='font-display text-2xl text-ink'>No cuts match.</p>
              <p className='mt-2 text-[14px] text-muted'>
                Try clearing a filter or searching for a different cut.
              </p>
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
