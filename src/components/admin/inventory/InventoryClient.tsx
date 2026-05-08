'use client';
import { useState, useMemo } from 'react';
import { CATEGORY_PAR } from '@/lib/inventory';
import { statCellBorderClasses } from '@/lib/admin-utils';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/admin-constants';
import InventoryAgingRoom from './InventoryAgingRoom';
import InventoryUpcomingDeliveries from './InventoryUpcomingDeliveries';

export type InventoryRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  images: string[];
  stockCount: number;
  isAged: boolean;
  createdAt: string;
};

export type InventoryCounts = {
  all: number;
  inStock: number;
  lowStock: number;
  critical: number;
  agingRoom: number;
};

type Props = {
  rows: InventoryRow[];
  counts: InventoryCounts;
  categoryCounts: Record<string, number>;
};

type StatFilter = 'all' | 'inStock' | 'lowStock' | 'critical';
type SortBy = 'stock-asc' | 'stock-desc' | 'name-asc' | 'price-desc' | 'newest';

const CATEGORY_SUPPLIER: Record<string, { name: string; loc: string }> = {
  Beef: { name: 'Hartwell Ranch', loc: 'CENTRAL VALLEY' },
  Pork: { name: 'Wildwood Farm', loc: 'SAN LUIS OBISPO' },
  Poultry: { name: 'Sunridge Farm', loc: 'VENTURA COUNTY' },
  Lamb: { name: 'Coastal Lamb Co.', loc: 'CENTRAL COAST' },
  Charcuterie: { name: 'Wildwood Farm', loc: 'SAN LUIS OBISPO' },
  Other: { name: 'Local Supplier', loc: 'SAN DIEGO' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Beef: 'bg-red-soft text-oxblood',
  Pork: 'bg-[rgba(184,137,90,0.18)] text-camel',
  Lamb: 'bg-[rgba(28,24,20,0.08)] text-ink-soft',
  Poultry: 'bg-green-soft text-green',
  Charcuterie: 'bg-[rgba(184,137,90,0.12)] text-camel',
  Other: 'bg-[rgba(28,24,20,0.06)] text-muted',
};

type StockState = 'healthy' | 'low' | 'critical' | 'out' | 'over';

function getStockState(stockCount: number, par: number): StockState {
  if (stockCount === 0) return 'out';
  const ratio = stockCount / par;
  if (ratio > 1) return 'over';
  if (ratio >= 0.7) return 'healthy';
  if (ratio >= 0.3) return 'low';
  return 'critical';
}

const STOCK_BAR_COLOR: Record<StockState, string> = {
  healthy: 'bg-green',
  low: 'bg-amber',
  critical: 'bg-oxblood',
  out: 'bg-muted',
  over: 'bg-camel',
};

const STOCK_STATUS_STYLE: Record<StockState, string> = {
  healthy: 'bg-green-soft text-green',
  low: 'bg-amber-soft text-amber',
  critical: 'bg-red-soft text-oxblood',
  out: 'bg-[rgba(28,24,20,0.06)] text-muted',
  over: 'bg-green-soft text-green',
};

const STOCK_STATUS_LABEL: Record<StockState, string> = {
  healthy: 'In stock',
  low: 'Low stock',
  critical: 'Critical',
  out: 'Out of stock',
  over: 'Overstocked',
};

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'stock-asc', label: 'Stock: Lowest first' },
  { value: 'stock-desc', label: 'Stock: Highest first' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'newest', label: 'Newest first' },
];


const PAGE_SIZE = 8;

export default function InventoryClient({ rows, counts, categoryCounts }: Props) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatFilter>('all');
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('stock-asc');
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    let list = rows;

    if (activeFilter === 'inStock') {
      list = list.filter((r) => {
        const par = CATEGORY_PAR[r.category] ?? 15;
        return r.stockCount > 0 && r.stockCount / par >= 0.7;
      });
    } else if (activeFilter === 'lowStock') {
      list = list.filter((r) => {
        const par = CATEGORY_PAR[r.category] ?? 15;
        const ratio = r.stockCount / par;
        return r.stockCount > 0 && ratio >= 0.3 && ratio < 0.7;
      });
    } else if (activeFilter === 'critical') {
      list = list.filter((r) => {
        const par = CATEGORY_PAR[r.category] ?? 15;
        return r.stockCount > 0 && r.stockCount / par < 0.3;
      });
    }

    if (activeCategory) {
      list = list.filter((r) => r.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const supplier = CATEGORY_SUPPLIER;
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (supplier[r.category]?.name ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (sortBy === 'stock-asc') sorted.sort((a, b) => a.stockCount - b.stockCount);
    else if (sortBy === 'stock-desc') sorted.sort((a, b) => b.stockCount - a.stockCount);
    else if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'newest') sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return sorted;
  }, [rows, activeFilter, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter(f: StatFilter) {
    setActiveFilter(f);
    setPage(1);
  }

  function handleCategory(cat: string) {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
    setPage(1);
  }

  function handleSort(s: SortBy) {
    setSortBy(s);
    setSortOpen(false);
    setPage(1);
  }

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort';

  const statCells: Array<{
    id: string;
    key: StatFilter;
    label: string;
    value: number | string;
    meta: string;
    dotColor: string;
    suffix?: string;
  }> = [
    { id: 'all-skus', key: 'all', label: 'All SKUs', value: counts.all, meta: 'TRACKED', dotColor: 'bg-muted' },
    { id: 'in-stock', key: 'inStock', label: 'In stock', value: counts.inStock, meta: 'ABOVE PAR', dotColor: 'bg-green' },
    { id: 'low-stock', key: 'lowStock', label: 'Low stock', value: counts.lowStock, meta: 'BELOW 70%', dotColor: 'bg-amber' },
    { id: 'critical', key: 'critical', label: 'Critical', value: counts.critical, meta: 'REORDER NOW', dotColor: 'bg-oxblood', suffix: counts.critical > 0 ? '!' : undefined },
    { id: 'aging-room', key: 'all', label: 'Aging room', value: counts.agingRoom, meta: 'IN CABINET', dotColor: 'bg-muted' },
  ];

  return (
    <div>
      {/* Alert banner */}
      {counts.critical > 0 && !alertDismissed && (
        <div className="flex items-center gap-3.5 px-6 py-4 bg-red-soft border border-[rgba(107,31,31,0.2)] rounded mb-6 text-[14px] text-ink-soft">
          <span className="w-8 h-8 rounded-full bg-oxblood text-cream grid place-items-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>
            <strong className="text-ink font-medium">{counts.critical} cut{counts.critical !== 1 ? 's' : ''} below reorder threshold.</strong>{' '}
            Take action now or place an order.
          </span>
          <button
            onClick={() => setAlertDismissed(true)}
            className="ml-auto text-muted hover:text-ink text-lg leading-none transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-paper border border-line-soft rounded overflow-hidden mb-6">
        {statCells.map((cell, idx) => {
          const isAgingCell = cell.id === 'aging-room';
          const isActive = !isAgingCell && activeFilter === cell.key;
          return (
            <div
              key={cell.id}
              onClick={() => !isAgingCell && handleFilter(cell.key)}
              className={[
                'relative px-5 py-5 transition-colors',
                isAgingCell ? 'cursor-default' : 'cursor-pointer hover:bg-cream',
                isActive ? 'bg-cream' : '',
                statCellBorderClasses(idx),
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.18em] uppercase text-muted font-medium">
                  {cell.label}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${cell.dotColor}`} />
              </div>
              <div className="font-display text-[22px] sm:text-[28px] font-normal leading-none tracking-tight mb-1">
                {cell.value}
                {cell.suffix && (
                  <em className="not-italic text-oxblood text-sm ml-0.5">{cell.suffix}</em>
                )}
              </div>
              <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{cell.meta}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="flex items-center gap-2.5 bg-paper border border-line rounded-full px-4 py-2 focus-within:border-ink transition-colors w-full sm:w-auto sm:min-w-65">
              <svg className="w-3 h-3 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by cut, SKU, supplier…"
                className="flex-1 border-none bg-transparent outline-none text-[13px] text-ink placeholder:text-muted py-0.5"
              />
              <span className="hidden sm:inline font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>

            {/* Category filters */}
            <button
              onClick={() => handleCategory('')}
              className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                activeCategory === ''
                  ? 'bg-ink border-ink text-cream'
                  : 'bg-paper border-line text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              All categories
            </button>
            {PRODUCT_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-ink border-ink text-cream'
                    : 'bg-paper border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {cat}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-cream/20 text-cream' : 'bg-cream-deep text-muted'}`}>
                  {categoryCounts[cat]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft font-medium hover:border-ink hover:text-ink transition-colors"
            >
              Sort: {currentSortLabel}
              <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-paper border border-line rounded shadow-md min-w-50 py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSort(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-cream ${
                      sortBy === opt.value ? 'text-oxblood font-medium' : 'text-ink-soft'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock table */}
      <div className="bg-paper border border-line-soft rounded overflow-hidden mb-6">
        <div className="overflow-x-auto relative">
          {/* Scroll hint gradient */}
          <div className="absolute top-0 right-0 bottom-0 w-12 bg-linear-to-l from-paper pointer-events-none lg:hidden z-10" />
          <table className="w-full border-collapse text-sm min-w-225">
            <thead className="bg-cream border-b border-line-soft">
              <tr>
                <th className="text-left pl-6 pr-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Cut
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Category
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Stock
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Status
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Price /lb
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Supplier
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Aged
                </th>
                <th className="pr-6 pl-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted text-[14px]">
                    No cuts match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const par = CATEGORY_PAR[row.category] ?? 15;
                  const state = getStockState(row.stockCount, par);
                  const barWidth = Math.min((row.stockCount / par) * 100, 100);
                  const thumb = row.images[0] ?? null;
                  const supplier = CATEGORY_SUPPLIER[row.category];

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line-soft last:border-b-0 hover:bg-cream transition-colors cursor-pointer group"
                    >
                      {/* Product */}
                      <td className="pl-6 pr-4 py-3.5 min-w-60">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded bg-cream-deep shrink-0 overflow-hidden">
                            {thumb?.startsWith('http') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt={row.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full" />
                            )}
                          </div>
                          <div>
                            <div className="font-display text-[15px] font-medium tracking-tight leading-snug mb-0.5">
                              {row.name}
                            </div>
                            <div className="font-mono text-[11px] text-muted tracking-[0.04em]">
                              {row.category.toUpperCase()}
                              {row.isAged ? ' · AGED' : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase ${
                            CATEGORY_COLORS[row.category] ?? 'bg-cream-deep text-muted'
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>

                      {/* Stock level bar */}
                      <td className="px-4 py-3.5 min-w-40">
                        <div className="w-full max-w-40">
                          <div className="flex justify-between mb-1 font-mono text-[11px] tracking-[0.02em]">
                            <span className="text-ink font-medium">{row.stockCount} units</span>
                            <span className="text-muted">/ {par} par</span>
                          </div>
                          <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${STOCK_BAR_COLOR[state]}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${
                            STOCK_STATUS_STYLE[state]
                          }`}
                        >
                          {STOCK_STATUS_LABEL[state]}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5">
                        <span className="font-display text-[15px] font-medium tracking-tight">
                          ${(row.price / 100).toFixed(2)}
                          <em className="not-italic text-[11px] text-muted font-normal ml-0.5">/lb</em>
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3.5">
                        {supplier ? (
                          <div>
                            <div className="text-[13px] font-medium text-ink leading-snug">{supplier.name}</div>
                            <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{supplier.loc}</div>
                          </div>
                        ) : (
                          <span className="text-muted text-[13px]">—</span>
                        )}
                      </td>

                      {/* Aging */}
                      <td className="px-4 py-3.5">
                        {row.isAged ? (
                          <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">
                            <strong className="text-ink font-medium">Aged</strong>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="pr-6 pl-4 py-3.5 text-right">
                        <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-7 h-7 rounded-full bg-transparent border border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink transition-colors grid place-items-center"
                            aria-label="Adjust stock"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="w-7 h-7 rounded-full bg-transparent border border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink transition-colors grid place-items-center"
                            aria-label="Order more"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="1" y="3" width="15" height="13" />
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                              <circle cx="5.5" cy="18.5" r="2.5" />
                              <circle cx="18.5" cy="18.5" r="2.5" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line-soft bg-cream flex-wrap gap-3">
          <div className="font-mono text-[12px] text-muted tracking-[0.04em]">
            Showing <strong className="text-ink font-medium">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong>{' '}
            of <strong className="text-ink font-medium">{filtered.length}</strong> cuts
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded border border-line bg-paper text-ink-soft text-[13px] grid place-items-center hover:border-ink hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded border text-[13px] grid place-items-center transition-colors ${
                  p === page
                    ? 'bg-ink border-ink text-cream'
                    : 'bg-paper border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded border border-line bg-paper text-ink-soft text-[13px] grid place-items-center hover:border-ink hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Two-column grid: Aging room + Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InventoryAgingRoom />
        <InventoryUpcomingDeliveries />
      </div>

      {/* Click-outside handler for sort dropdown */}
      {sortOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setSortOpen(false)}
        />
      )}
    </div>
  );
}
