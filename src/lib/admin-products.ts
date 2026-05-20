// Pure, dependency-light business rules for the admin products dashboard.
// Lives next to admin-customers / admin-orders so all three slices share the
// same shape: a single `apply…Filter` that runs the in-memory filter chain,
// a `sort…` that knows every mode, a stat-strip counter, and the union types
// the page passes through query strings to the export endpoint.

import type { ProductTableRow } from '@/types/admin';

// Status filter — drives both the stat strip chips and the export query.
// `'all'` is the no-op pass-through; the other three correspond to the
// in-strip filter buttons.
export type ProductStatusFilter = 'all' | 'inStock' | 'outOfStock' | 'featured';

export const PRODUCT_STATUS_FILTERS = [
  'all',
  'inStock',
  'outOfStock',
  'featured',
] as const;

// Coerce an untrusted query-string value (or arbitrary client state) into a
// known status filter, falling back to `'all'` on anything unrecognised.
export const parseProductStatus = (raw: string | null | undefined): ProductStatusFilter => {
  switch (raw) {
    case 'inStock':
    case 'outOfStock':
    case 'featured':
      return raw;
    default:
      return 'all';
  }
};

// Sort modes — same union shared by the client dropdown, the export endpoint,
// and any future deep-link param. Keeping the literal union in one place stops
// the two surfaces from drifting (and the export route used to inline its own
// copy of the same six keys).
export type ProductSortMode =
  | 'newest'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'top-rated';

export const PRODUCT_SORT_OPTIONS: { value: ProductSortMode; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'top-rated', label: 'Top rated' },
];

export const parseProductSortMode = (raw: string | null | undefined): ProductSortMode => {
  switch (raw) {
    case 'oldest':
    case 'price-asc':
    case 'price-desc':
    case 'name-asc':
    case 'top-rated':
      return raw;
    default:
      return 'newest';
  }
};

// Single-row status check — exposed because the export route filters in
// memory after a Mongo fetch and needs the same predicate the client uses.
type StatusShape = Pick<ProductTableRow, 'stockCount' | 'isFeatured'>;

export const matchesProductStatus = (
  product: StatusShape,
  status: ProductStatusFilter,
): boolean => {
  if (status === 'all') return true;
  if (status === 'inStock') return product.stockCount > 0;
  if (status === 'outOfStock') return product.stockCount === 0;
  if (status === 'featured') return product.isFeatured;
  return true;
};

// In-memory filter chain — status → category → free-text search. Mirrors the
// useMemo block that lived inside ProductsClient. The search matches name or
// category, case-insensitive.
export type ProductFilterInput = {
  search: string;
  category: string;
  status: ProductStatusFilter;
};

export const applyProductsFilter = (
  rows: ProductTableRow[],
  { search, category, status }: ProductFilterInput,
): ProductTableRow[] => {
  let next = rows;
  if (status !== 'all') {
    next = next.filter((p) => matchesProductStatus(p, status));
  }
  if (category) {
    next = next.filter((p) => p.category === category);
  }
  const q = search.trim().toLowerCase();
  if (q) {
    next = next.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }
  return next;
};

// Pure sort — returns a new array so callers don't need to copy first.
export const sortProducts = (
  rows: ProductTableRow[],
  mode: ProductSortMode,
): ProductTableRow[] => {
  const next = [...rows];
  switch (mode) {
    case 'newest':
      return next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case 'oldest':
      return next.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    case 'price-asc':
      return next.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return next.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return next.sort((a, b) => a.name.localeCompare(b.name));
    case 'top-rated':
      return next.sort((a, b) => b.rating - a.rating);
  }
};

// Used by the page-level server components that pre-aggregate counts for the
// category pill row. Generic enough to accept the lean Mongo doc or the
// serialised row — both shapes carry a `category` string.
export const productCategoryCounts = (
  rows: ReadonlyArray<{ category: string }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
};
