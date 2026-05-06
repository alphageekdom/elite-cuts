'use client';
import { useState, useMemo } from 'react';

// Mirrored from Product model — defined here to avoid importing server-only mongoose module
const PRODUCT_CATEGORIES = ['Beef', 'Pork', 'Poultry', 'Lamb', 'Charcuterie', 'Other'] as const;
type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type ProductTableRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isAged: boolean;
  isNewArrival: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCounts = {
  all: number;
  inStock: number;
  outOfStock: number;
  featured: number;
  avgPrice: number;
};

type Props = {
  products: ProductTableRow[];
  counts: ProductCounts;
  categoryCounts: Record<string, number>;
};

type StatFilter = 'all' | 'inStock' | 'outOfStock' | 'featured';
type SortBy = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc' | 'top-rated';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'top-rated', label: 'Top rated' },
];

const STAT_CELLS: Array<{
  key: StatFilter | 'avgPrice';
  label: string;
  meta: string;
  dotStyle: string;
  isInfo?: boolean;
}> = [
  { key: 'all', label: 'All products', meta: 'IN CATALOG', dotStyle: 'var(--color-muted)' },
  { key: 'inStock', label: 'In Stock', meta: 'AVAILABLE', dotStyle: 'var(--color-green)' },
  { key: 'outOfStock', label: 'Out of Stock', meta: 'UNAVAILABLE', dotStyle: 'var(--color-oxblood)' },
  { key: 'avgPrice', label: 'Avg price', meta: 'PER UNIT', dotStyle: 'var(--color-camel)', isInfo: true },
  { key: 'featured', label: 'Featured', meta: 'ON HOMEPAGE', dotStyle: 'var(--color-camel)' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Beef: 'bg-red-soft text-oxblood',
  Pork: 'bg-[rgba(184,137,90,0.18)] text-camel',
  Lamb: 'bg-[rgba(28,24,20,0.08)] text-ink-soft',
  Poultry: 'bg-green-soft text-green',
  Charcuterie: 'bg-[rgba(184,137,90,0.12)] text-camel',
  Other: 'bg-[rgba(28,24,20,0.06)] text-muted',
};

// Decorative sparkline point strings — valid for SVG <polyline points="…">
const SPARKS = [
  '0,20 10,16 20,18 30,10 40,12 50,6 60,4',
  '0,18 10,14 20,16 30,8 40,12 50,10 60,6',
  '0,22 10,20 20,18 30,14 40,10 50,6 60,2',
  '0,8 10,10 20,6 30,12 40,14 50,16 60,18',
  '0,20 10,18 20,14 30,10 40,8 50,4 60,2',
  '0,12 10,10 20,14 30,12 40,10 50,12 60,10',
];

// Deterministic sale counts derived from product index — no Math.random() to avoid hydration mismatch
const SPARK_COUNTS = [142, 98, 63, 87, 54, 45, 38, 72, 110, 56, 91, 33];

const SPARK_COLORS = ['#4A6B3A', '#4A6B3A', '#4A6B3A', '#6B1F1F', '#4A6B3A', '#8A7F73'];
const SPARK_CHANGES = ['+14%', '+8%', '+22%', '−4%', '+31%', '0%'];
const SPARK_DIRS = ['up', 'up', 'up', 'down', 'up', 'flat'] as const;

function stockState(count: number): 'healthy' | 'low' | 'critical' | 'out' {
  if (count === 0) return 'out';
  if (count < 5) return 'critical';
  if (count < 15) return 'low';
  return 'healthy';
}

const STOCK_FILL: Record<string, string> = {
  healthy: 'var(--color-green)',
  low: 'var(--color-amber, #A87B2B)',
  critical: 'var(--color-oxblood)',
  out: 'var(--color-muted)',
};

function stockFillWidth(count: number): number {
  return Math.min((count / 50) * 100, 100);
}

const PAGE_SIZE = 8;

export default function ProductsClient({ products, counts, categoryCounts }: Props) {
  const [activeFilter, setActiveFilter] = useState<StatFilter>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const filtered = useMemo(() => {
    let rows = products;

    if (activeFilter === 'inStock') rows = rows.filter((p) => p.stockCount > 0);
    else if (activeFilter === 'outOfStock') rows = rows.filter((p) => p.stockCount === 0);
    else if (activeFilter === 'featured') rows = rows.filter((p) => p.isFeatured);

    if (activeCategory) rows = rows.filter((p) => p.category === activeCategory);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    const sorted = [...rows];
    if (sortBy === 'newest') sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    else if (sortBy === 'oldest') sorted.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    else if (sortBy === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'top-rated') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [products, activeFilter, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(pageRows.map((r) => r.id)));
    else setSelectedIds(new Set());
  }

  function openDrawer() {
    setDrawerOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    setDrawerOpen(false);
    document.body.style.overflow = '';
  }

  function handleStatFilter(key: StatFilter | 'avgPrice') {
    if (key === 'avgPrice') return;
    setActiveFilter(key);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleCategoryFilter(cat: string) {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
    setPage(1);
    setSelectedIds(new Set());
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function statCellValue(key: StatFilter | 'avgPrice'): string {
    if (key === 'all') return String(counts.all);
    if (key === 'inStock') return String(counts.inStock);
    if (key === 'outOfStock') return String(counts.outOfStock);
    if (key === 'featured') return String(counts.featured);
    if (key === 'avgPrice') {
      return `$${counts.avgPrice.toFixed(2)}`;
    }
    return '—';
  }

  // Border classes per cell index — same pattern as orders page
  function cellBorderClasses(idx: number) {
    const isRightEdge2 = idx % 2 === 1;
    const isRightEdge3 = idx % 3 === 2;
    const isLastRow2 = idx >= 3;
    const isLastRow3 = idx >= 3;
    return [
      'border-r border-b border-line-soft',
      isRightEdge2 ? 'border-r-0' : '',
      isLastRow2 ? 'border-b-0' : '',
      isRightEdge3 ? 'sm:border-r-0' : 'sm:border-r',
      isLastRow3 ? 'sm:border-b-0' : 'sm:border-b',
      idx < 4 ? 'lg:border-r lg:border-line-soft' : 'lg:border-r-0',
      'lg:border-b-0',
    ].join(' ');
  }

  return (
    <>
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-paper border border-line-soft rounded-sm mb-6 overflow-hidden">
        {STAT_CELLS.map((cell, idx) => {
          const isActive = !cell.isInfo && activeFilter === cell.key;
          const val = statCellValue(cell.key);
          return (
            <button
              key={cell.key}
              onClick={() => handleStatFilter(cell.key)}
              disabled={cell.isInfo}
              className={[
                'relative text-left px-4 py-4 sm:px-5 sm:py-5 transition-colors',
                cell.isInfo ? 'cursor-default' : 'cursor-pointer',
                cellBorderClasses(idx),
                isActive ? 'bg-cream' : cell.isInfo ? '' : 'hover:bg-cream',
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.18em] uppercase text-muted">
                  {cell.label}
                </span>
                <span className="w-2 h-2 rounded-full" style={{ background: cell.dotStyle }} />
              </div>
              <div className="font-display text-[22px] sm:text-[28px] font-normal leading-none tracking-tight mb-1">
                {val}
              </div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{cell.meta}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Row 1: search */}
        <label className="flex items-center gap-2.5 bg-paper border border-line rounded-full px-4 py-2 w-full sm:max-w-xs focus-within:border-ink transition-colors">
          <svg className="w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, category…"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-muted min-w-0"
          />
          <span className="hidden sm:inline font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded tracking-[0.04em] shrink-0">⌘ K</span>
        </label>

        {/* Row 2: category pills left, view/sort/add right */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* All categories */}
            <button
              onClick={() => handleCategoryFilter('')}
              className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                activeCategory === ''
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-paper border-line text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              All
            </button>
            {PRODUCT_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-paper border-line text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {cat}
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      activeCategory === cat
                        ? 'bg-cream/20 text-cream'
                        : 'bg-cream-deep text-ink-soft'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center bg-paper border border-line rounded-full hover:border-ink transition-colors">
              <span className="pl-3.5 pr-1 text-[13px] text-ink-soft pointer-events-none whitespace-nowrap">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
                className="appearance-none bg-transparent border-none outline-none text-[13px] text-ink-soft pr-7 pl-1 py-2 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="w-3 h-3 text-muted absolute right-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <button
              onClick={openDrawer}
              className="inline-flex items-center gap-1.5 bg-ink text-cream rounded-full px-3.5 py-2 text-[13px] font-medium hover:bg-oxblood transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add product
            </button>
          </div>
        </div>
      </div>

      {/* Table wrapper */}
      <div className="bg-paper border border-line-soft rounded-sm overflow-hidden">

        {/* Bulk bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-6 py-3 bg-ink text-cream">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="bg-camel text-ink text-[12px] font-medium px-2 py-0.5 rounded-full">
                {selectedIds.size}
              </span>
              selected
            </div>
            <div className="flex gap-1.5">
              {['Publish', 'Hide', 'Edit price', 'Archive', 'Delete'].map((action) => (
                <button
                  key={action}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] min-w-250">
              <thead className="bg-cream border-b border-line-soft">
                <tr>
                  <th className="w-9 pl-6 pr-0 py-3.5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                    />
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                    Product ↓
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Category</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Price</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Stock</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Status</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Tags</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">30d sales</th>
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted text-sm">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((product, i) => {
                    const absIdx = (page - 1) * PAGE_SIZE + i;
                    const isSelected = selectedIds.has(product.id);
                    const state = stockState(product.stockCount);
                    const fillPct = stockFillWidth(product.stockCount);
                    const sparkPath = SPARKS[absIdx % SPARKS.length];
                    const sparkColor = SPARK_COLORS[absIdx % SPARK_COLORS.length];
                    const sparkChange = SPARK_CHANGES[absIdx % SPARK_CHANGES.length];
                    const sparkDir = SPARK_DIRS[absIdx % SPARK_DIRS.length];
                    const catClass = CATEGORY_COLORS[product.category] ?? 'bg-cream-deep text-ink-soft';
                    const thumb = product.images[0] ?? null;

                    return (
                      <tr
                        key={product.id}
                        onClick={openDrawer}
                        className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-camel/6' : 'hover:bg-cream'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                          />
                        </td>

                        {/* Product */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3.5 min-w-60">
                            <div className="w-14 h-14 rounded-md bg-cream-deep shrink-0 overflow-hidden">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-muted">
                                  <svg className="w-5 h-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-display text-[15px] font-medium tracking-[-0.005em] leading-snug mb-0.5 truncate">
                                {product.name}
                              </div>
                              <div className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
                                {product.category} · ★ {product.rating.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase ${catClass}`}
                          >
                            {product.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4">
                          <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-muted italic font-normal ml-0.5">/lb</span>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-15 h-1.5 bg-cream-deep rounded-full overflow-hidden shrink-0">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${fillPct}%`, background: STOCK_FILL[state] }}
                              />
                            </div>
                            <span className="font-mono text-[12px] text-ink font-medium min-w-9">
                              {product.stockCount} lb
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {product.stockCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-green-soft text-green">
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-red-soft text-oxblood">
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              Out of Stock
                            </span>
                          )}
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-40">
                            {product.isAged && (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-red-soft text-oxblood">
                                AGED
                              </span>
                            )}
                            {product.isFeatured && (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-[rgba(184,137,90,0.18)] text-camel">
                                FEATURED
                              </span>
                            )}
                            {product.isNewArrival && (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-ink text-cream">
                                NEW
                              </span>
                            )}
                            {!product.isAged && !product.isFeatured && !product.isNewArrival && (
                              <span className="text-[11px] text-muted">—</span>
                            )}
                          </div>
                        </td>

                        {/* 30d sales sparkline (decorative) */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <svg viewBox="0 0 60 24" className="w-15 h-6 shrink-0">
                              <polyline
                                points={sparkPath}
                                fill="none"
                                stroke={sparkColor}
                                strokeWidth="1.5"
                              />
                            </svg>
                            <div>
                              <div className="font-mono text-[12px] text-ink font-medium">
                                {SPARK_COUNTS[absIdx % SPARK_COUNTS.length]}
                              </div>
                              <div
                                className={`font-mono text-[10px] ${
                                  sparkDir === 'up'
                                    ? 'text-green'
                                    : sparkDir === 'down'
                                    ? 'text-oxblood'
                                    : 'text-muted'
                                }`}
                              >
                                {sparkDir === 'up' ? '↑' : sparkDir === 'down' ? '↓' : '→'} {sparkChange}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Row actions */}
                        <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={openDrawer}
                              aria-label="Edit product"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              aria-label="More"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Scroll-hint fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-cream border-t border-line-soft flex-wrap gap-3">
          <div className="font-mono text-[12px] text-muted tracking-[0.04em]">
            Showing{' '}
            <strong className="text-ink font-medium">
              {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{' '}
            of <strong className="text-ink font-medium">{filtered.length}</strong> products
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="flex items-center gap-0.5 mx-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-full font-display text-[13px] transition-colors ${
                      page === n ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-1 text-muted">…</span>}
              {totalPages > 5 && (
                <button
                  onClick={() => setPage(totalPages)}
                  className={`w-8 h-8 rounded-full font-display text-[13px] transition-colors ${
                    page === totalPages ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
                  }`}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[12px] text-muted">
            <span>Per page</span>
            <select className="appearance-none bg-paper border border-line rounded-full pl-3 pr-6 py-1.5 text-[12px] text-ink font-mono cursor-pointer">
              <option>8</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Add product drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-150 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DrawerContent onClose={closeDrawer} />
      </aside>
    </>
  );
}

function DrawerContent({ onClose }: { onClose: () => void }) {
  const [published, setPublished] = useState(false);
  const [featuredToggle, setFeaturedToggle] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);

  return (
    <>
      {/* Head */}
      <div className="flex items-center justify-between gap-4 px-8 py-6 border-b border-line-soft bg-paper shrink-0">
        <div>
          <div className="font-display italic text-[13px] text-camel mb-1">✦ Add new</div>
          <div className="font-display text-[22px] font-medium tracking-[-0.015em]">
            New <em className="italic text-oxblood font-normal">product</em>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-cream border border-line text-ink grid place-items-center hover:border-ink transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">

        {/* Basic info */}
        <DrawerSection label="Basic information">
          <DrawerField label="Product name">
            <input type="text" placeholder="e.g. 28-Day Dry-Aged Ribeye" className={inputCls} />
          </DrawerField>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="SKU">
              <input type="text" placeholder="SKU-0033" className={inputCls} />
            </DrawerField>
            <DrawerField label="Category">
              <select className={selectCls}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </DrawerField>
          </div>
          <DrawerField label="Description">
            <textarea
              placeholder="Describe the cut, sourcing, and any preparation notes…"
              className={`${inputCls} resize-y min-h-20`}
            />
          </DrawerField>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="Grade / breed">
              <input type="text" placeholder="e.g. USDA Prime, Berkshire" className={inputCls} />
            </DrawerField>
            <DrawerField label="Supplier">
              <input type="text" placeholder="e.g. Hartwell Ranch" className={inputCls} />
            </DrawerField>
          </div>
        </DrawerSection>

        {/* Pricing */}
        <DrawerSection label="Pricing">
          <div className="grid grid-cols-3 gap-4">
            <DrawerField label="Price ($)">
              <input type="number" step="0.01" min="0" placeholder="42.99" className={inputCls} />
            </DrawerField>
            <DrawerField label="Unit">
              <select className={selectCls}>
                <option>/lb</option>
                <option>/ea</option>
                <option>/kg</option>
              </select>
            </DrawerField>
            <DrawerField label="Compare price">
              <input type="number" step="0.01" min="0" placeholder="49.99" className={inputCls} />
            </DrawerField>
          </div>
          <p className="text-[12px] text-muted">
            Compare price shows a strikethrough on the product card, implying a discount.
          </p>
        </DrawerSection>

        {/* Inventory */}
        <DrawerSection label="Inventory">
          <div className="grid grid-cols-3 gap-4">
            <DrawerField label="Current stock">
              <input type="number" min="0" placeholder="0" className={inputCls} />
            </DrawerField>
            <DrawerField label="Par level">
              <input type="number" min="0" placeholder="25" className={inputCls} />
            </DrawerField>
            <DrawerField label="Reorder point">
              <input type="number" min="0" placeholder="8" className={inputCls} />
            </DrawerField>
          </div>
          <p className="text-[12px] text-muted">
            Low stock alerts trigger when stock falls below the reorder point.
          </p>
        </DrawerSection>

        {/* Images */}
        <DrawerSection label="Images">
          <div className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-camel hover:bg-camel/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-cream-deep text-ink-soft grid place-items-center mx-auto mb-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-[13px] text-muted">
              <strong className="text-ink font-medium">Click to upload</strong> or drag and drop
              <br />PNG, JPG up to 5MB · First image is the thumbnail
            </p>
          </div>
        </DrawerSection>

        {/* Visibility */}
        <DrawerSection label="Visibility">
          <ToggleRow
            label="Published"
            desc="Product is visible on the storefront and available for purchase"
            on={published}
            onToggle={() => setPublished((v) => !v)}
          />
          <ToggleRow
            label="Featured"
            desc="Appears in the Featured Cuts section on the homepage"
            on={featuredToggle}
            onToggle={() => setFeaturedToggle((v) => !v)}
          />
          <ToggleRow
            label="Members only"
            desc="Only visible to Connoisseur tier and above"
            on={membersOnly}
            onToggle={() => setMembersOnly((v) => !v)}
          />
        </DrawerSection>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
        <button
          onClick={onClose}
          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save product
        </button>
      </div>
    </>
  );
}

const inputCls =
  'w-full border border-line bg-paper font-sans text-[14px] text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted/60';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-line-soft last:border-b-0 last:pb-0 space-y-4">
      <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">{label}</div>
      {children}
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-line-soft last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] font-medium tracking-[-0.005em] mb-0.5">{label}</div>
        <div className="text-[12px] text-muted">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`w-11 h-6 rounded-full border relative shrink-0 transition-colors ${
          on ? 'bg-green border-green' : 'bg-cream-deep border-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
