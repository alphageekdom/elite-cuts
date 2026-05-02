// Shared filter/sort definitions for the catalog page. Imported by both
// the server page (to translate URL params → Mongo query) and the client
// filter bar (to render the controls).

export const CATEGORY_FILTERS = [
  'All',
  'Beef',
  'Pork',
  'Poultry',
  'Lamb',
  'Charcuterie',
  'Other',
] as const;

export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export const isCategoryFilter = (value: string): value is CategoryFilter =>
  (CATEGORY_FILTERS as readonly string[]).includes(value);

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'newest', label: 'Newest' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const isSortValue = (value: string): value is SortValue =>
  SORT_OPTIONS.some((opt) => opt.value === value);

export const PAGE_SIZE = 12;
