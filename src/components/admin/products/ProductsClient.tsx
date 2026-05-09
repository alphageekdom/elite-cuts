'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { productImageSrc, statCellBorderClasses } from '@/lib/admin-utils';
import { PRODUCT_CATEGORIES, CATEGORY_COLORS } from '@/lib/admin-constants';
import type { ProductCategory } from '@/lib/admin-constants';
import type { ProductTableRow, ProductCounts } from '@/types/admin';
import ProductFormDrawer from './ProductFormDrawer';

export type { ProductTableRow, ProductCounts };

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
  { key: 'all', label: 'All cuts', meta: 'IN CATALOG', dotStyle: 'var(--color-muted)' },
  { key: 'inStock', label: 'In Stock', meta: 'AVAILABLE', dotStyle: 'var(--color-green)' },
  { key: 'outOfStock', label: 'Out of Stock', meta: 'UNAVAILABLE', dotStyle: 'var(--color-oxblood)' },
  { key: 'avgPrice', label: 'Avg price', meta: 'PER LB', dotStyle: 'var(--color-camel)', isInfo: true },
  { key: 'featured', label: 'Featured', meta: 'ON HOMEPAGE', dotStyle: 'var(--color-camel)' },
];

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

const PAGE_SIZES = [8, 20, 50];

export default function ProductsClient({ products, counts, categoryCounts }: Props) {
  const [localProducts, setLocalProducts] = useState(products);
  const [activeFilter, setActiveFilter] = useState<StatFilter>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<ProductTableRow | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(8);

  async function handleSave(fd: FormData, id?: string) {
    try {
      const res = await fetch(id ? `/api/products/${id}` : '/api/products', {
        method: id ? 'PUT' : 'POST',
        body: fd,
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to save product');
        return;
      }
      const data = await res.json();
      const now = new Date().toISOString();
      const cat = fd.get('category') as ProductCategory;
      if (id) {
        setLocalProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: fd.get('name') as string,
                  category: cat,
                  price: Number(fd.get('price')),
                  stockCount: Number(fd.get('stockCount')),
                  updatedAt: now,
                }
              : p,
          ),
        );
        toast.success('Product updated');
      } else {
        setLocalProducts((prev) => [
          {
            id: data.id as string,
            name: fd.get('name') as string,
            category: cat,
            price: Number(fd.get('price')),
            stockCount: Number(fd.get('stockCount')),
            images: [],
            isFeatured: false,
            isAged: false,
            isNewArrival: true,
            rating: 0,
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ]);
        toast.success('Product created');
      }
      closeDrawer();
    } catch {
      toast.error('Failed to save product');
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) { const { message } = await res.json(); toast.error(message ?? 'Failed to archive product'); return; }
      setOpenMenuId(null);
      toast.success('Product archived');
    } catch { toast.error('Failed to archive product'); }
  }

  async function handleDuplicate(product: ProductTableRow) {
    try {
      const fd = new FormData();
      fd.append('name', `${product.name} (Copy)`);
      fd.append('category', product.category);
      fd.append('description', '');
      fd.append('price', String(product.price));
      fd.append('stockCount', '0');
      const res = await fetch('/api/products', { method: 'POST', body: fd });
      if (!res.ok) { const { message } = await res.json(); toast.error(message ?? 'Failed to duplicate product'); return; }
      const data = await res.json();
      const now = new Date().toISOString();
      setLocalProducts((prev) => [
        { ...product, id: data.id as string, name: `${product.name} (Copy)`, stockCount: 0, images: [], createdAt: now, updatedAt: now },
        ...prev,
      ]);
      setOpenMenuId(null);
      toast.success('Product duplicated');
    } catch { toast.error('Failed to duplicate product'); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete product');
        return;
      }
      setLocalProducts((prev) => prev.filter((p) => p.id !== id));
      setOpenMenuId(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  }

  const filtered = useMemo(() => {
    let rows = localProducts;

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
  }, [localProducts, activeFilter, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

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

  function openDrawer(product?: ProductTableRow) {
    setDrawerProduct(product ?? null);
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

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  const [bulkLoading, setBulkLoading] = useState('');
  const [editPriceMode, setEditPriceMode] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');

  async function bulkPatch(body: Record<string, unknown>, label: string) {
    const ids = [...selectedIds];
    setBulkLoading(label);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        ),
      );
      if (body.isActive !== undefined) {
        setLocalProducts((prev) => prev.map((p) => (selectedIds.has(p.id) ? { ...p } : p)));
      }
      if (body.price !== undefined) {
        const price = body.price as number;
        setLocalProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, price } : p)),
        );
      }
      setSelectedIds(new Set());
      setEditPriceMode(false);
      toast.success(`${ids.length} product${ids.length !== 1 ? 's' : ''} updated`);
    } catch {
      toast.error('Failed to update some products');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    setBulkLoading('delete');
    try {
      await Promise.all(ids.map((id) => fetch(`/api/products/${id}`, { method: 'DELETE' })));
      setLocalProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} product${ids.length !== 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Failed to delete some products');
    } finally {
      setBulkLoading('');
    }
  }

  function statCellValue(key: StatFilter | 'avgPrice'): string {
    if (key === 'all') return String(counts.all);
    if (key === 'inStock') return String(counts.inStock);
    if (key === 'outOfStock') return String(counts.outOfStock);
    if (key === 'featured') return String(counts.featured);
    if (key === 'avgPrice') return `$${counts.avgPrice.toFixed(2)}`;
    return '—';
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
                statCellBorderClasses(idx, 5),
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
            placeholder="Search cuts, categories…"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-muted min-w-0"
          />
          <span className="hidden sm:inline font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded tracking-[0.04em] shrink-0">⌘ K</span>
        </label>

        {/* Row 2: category pills left, view/sort/add right */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => openDrawer()}
              className="inline-flex items-center gap-1.5 bg-ink text-cream rounded-full px-3.5 py-2 text-[13px] font-medium hover:bg-oxblood transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add cut
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => bulkPatch({ isActive: true }, 'publish')}
                disabled={!!bulkLoading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'publish' ? 'Updating…' : 'Publish'}
              </button>
              <button
                onClick={() => bulkPatch({ isActive: false }, 'unpublish')}
                disabled={!!bulkLoading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'unpublish' ? 'Updating…' : 'Unpublish'}
              </button>
              {editPriceMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="New price"
                    autoFocus
                    className="w-24 bg-cream/10 border border-cream/30 rounded-full px-3 py-1 text-[12px] text-cream outline-none placeholder:text-cream/40"
                  />
                  <button
                    onClick={() => {
                      const p = parseFloat(bulkPrice);
                      if (!isNaN(p) && p >= 0) bulkPatch({ price: p }, 'price');
                    }}
                    disabled={!!bulkLoading || !bulkPrice}
                    className="bg-camel text-ink rounded-full px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
                  >
                    {bulkLoading === 'price' ? '…' : 'Set'}
                  </button>
                  <button
                    onClick={() => setEditPriceMode(false)}
                    className="text-cream/60 text-[12px] px-2 hover:text-cream"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditPriceMode(true)}
                  disabled={!!bulkLoading}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
                >
                  Edit price
                </button>
              )}
              <button
                onClick={bulkDelete}
                disabled={!!bulkLoading}
                className="bg-oxblood/70 text-cream border border-oxblood rounded-full px-3 py-1.5 text-[12px] hover:bg-oxblood transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'delete' ? 'Deleting…' : 'Delete'}
              </button>
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
                    Cut ↓
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Category</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Price /lb</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Stock</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Status</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Tags</th>
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted text-sm">
                      No cuts match your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((product) => {
                    const isSelected = selectedIds.has(product.id);
                    const state = stockState(product.stockCount);
                    const fillPct = stockFillWidth(product.stockCount);
                    const catClass = CATEGORY_COLORS[product.category] ?? 'bg-cream-deep text-ink-soft';
                    const thumb = productImageSrc(product.images[0]);

                    return (
                      <tr
                        key={product.id}
                        onClick={() => openDrawer(product)}
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
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase ${catClass}`}>
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

                        {/* Row actions */}
                        <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center gap-1">
                            <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openDrawer(product)}
                                aria-label="Edit product"
                                className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setOpenMenuId((prev) => prev === product.id ? null : product.id)}
                                aria-label="More actions"
                                className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
                                </svg>
                              </button>
                            </div>
                            {openMenuId === product.id && (
                              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25">
                                <button
                                  onClick={() => handleDuplicate(product)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                  </svg>
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => handleArchive(product.id)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                                  </svg>
                                  Archive
                                </button>
                                <div className="border-t border-cream/25" />
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-red-400 hover:bg-cream/10 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
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
              {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)}
            </strong>{' '}
            of <strong className="text-ink font-medium">{filtered.length}</strong> cuts
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
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="appearance-none bg-paper border border-line rounded-full pl-3 pr-6 py-1.5 text-[12px] text-ink font-mono cursor-pointer"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Menu backdrop */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Add / Edit product drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-150 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <ProductFormDrawer
          key={drawerProduct?.id ?? 'new'}
          product={drawerProduct}
          onClose={closeDrawer}
          onSave={handleSave}
        />
      </aside>
    </>
  );
}
