'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import ProductTableRowComponent from './ProductTableRow';
import { useStatFilter } from '@/hooks/useStatFilter';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import { PRODUCT_CATEGORIES } from '@/lib/admin-constants';
import type { ProductCategory } from '@/lib/admin-constants';
import type { ProductTableRow, ProductCounts } from '@/types/admin';
import ProductFormDrawer from './ProductFormDrawer';

export type { ProductTableRow, ProductCounts };

type Props = {
  products: ProductTableRow[];
  counts: ProductCounts;
  categoryCounts: Record<string, number>;
};

type SortBy = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc' | 'top-rated';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'top-rated', label: 'Top rated' },
];



const PAGE_SIZES = [8, 20, 50];

export default function ProductsClient({ products, counts, categoryCounts }: Props) {
  const [localProducts, setLocalProducts] = useState(products);
  const { activeKey: activeFilter, selectKey: _selectFilter } = useStatFilter('all');
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

  function handleStatFilter(key: string) {
    if (key === 'avgPrice') return;
    _selectFilter(key);
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

  return (
    <>
      <AdminStatStrip
        cells={[
          { key: 'all',        label: 'All cuts',     meta: 'IN CATALOG',  dotClass: 'bg-muted',   value: counts.all },
          { key: 'inStock',    label: 'In Stock',     meta: 'AVAILABLE',   dotClass: 'bg-green',   value: counts.inStock },
          { key: 'outOfStock', label: 'Out of Stock', meta: 'UNAVAILABLE', dotClass: 'bg-oxblood', value: counts.outOfStock },
          { key: 'avgPrice',   label: 'Avg price',    meta: 'PER LB',      dotClass: 'bg-camel',   value: `$${counts.avgPrice.toFixed(2)}`, clickable: false },
          { key: 'featured',   label: 'Featured',     meta: 'ON HOMEPAGE', dotClass: 'bg-camel',   value: counts.featured },
        ]}
        activeKey={activeFilter}
        onSelect={handleStatFilter}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Row 1: search */}
        <AdminSearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search cuts, categories…"
          className="w-full sm:max-w-xs"
        />

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
                  pageRows.map((product) => (
                    <ProductTableRowComponent
                      key={product.id}
                      product={product}
                      isSelected={selectedIds.has(product.id)}
                      openMenuId={openMenuId}
                      onEdit={openDrawer}
                      onToggleSelect={toggleSelect}
                      onMenuToggle={setOpenMenuId}
                      onDuplicate={handleDuplicate}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Scroll-hint fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          filteredCount={filtered.length}
          perPage={perPage}
          pageSizes={PAGE_SIZES}
          noun="cuts"
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
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
