'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ProductTableRowComponent from './ProductTableRow';
import ProductsPageHeader from './ProductsPageHeader';
import ProductImportDrawer from './ProductImportDrawer';
import ProductsBulkBar from './ProductsBulkBar';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useProductsTable } from '@/hooks/useProductsTable';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import AdminSortPopover from '@/components/admin/AdminSortPopover';
import { PRODUCT_CATEGORIES } from '@/lib/admin-constants';
import {
  PRODUCT_SORT_OPTIONS,
  applyProductsFilter,
  parseProductStatus,
  sortProducts,
  type ProductSortMode,
} from '@/lib/admin-products';
import { formatMoney } from '@/lib/format';
import type { ProductTableRow, ProductCounts } from '@/types/admin';
import ProductFormDrawer from './ProductFormDrawer';

export type { ProductTableRow, ProductCounts };

type Props = {
  products: ProductTableRow[];
  counts: ProductCounts;
  categoryCounts: Record<string, number>;
  headerCounts: { total: number; inStock: number; outOfStock: number };
};

const PAGE_SIZES = [8, 20, 50];

export default function ProductsClient({ products, counts, categoryCounts, headerCounts }: Props) {
  const router = useRouter();
  const table = useProductsTable(products);
  const {
    products: localProducts,
    drawer,
    selectedIds,
    openMenuId,
    setOpenMenuId,
    toggleSelect,
    selectAll,
    clearSelection,
    bulk,
  } = table;

  const [page, setPage] = useState(1);
  const { activeKey: activeFilter, selectKey: _selectFilter } = useStatFilter<string>('all', () => setPage(1));
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ProductSortMode>('newest');
  const [perPage, setPerPage] = useState(8);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('status', activeFilter);
      if (activeCategory) params.set('category', activeCategory);
      if (search.trim()) params.set('search', search.trim());
      params.set('sort', sortBy);
      const url = `/api/products/export${params.size ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        toast.error('Export failed');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? 'products.csv';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success('Products exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleSave(fd: FormData, id?: string) {
    const ok = await table.save(fd, id);
    if (ok) drawer.close();
  }

  const filtered = useMemo(() => {
    const filteredRows = applyProductsFilter(localProducts, {
      search,
      category: activeCategory,
      status: parseProductStatus(activeFilter),
    });
    return sortProducts(filteredRows, sortBy);
  }, [localProducts, activeFilter, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  function toggleAll(checked: boolean) {
    if (checked) selectAll(pageRows);
    else clearSelection();
  }

  function openDrawer(product?: ProductTableRow) {
    drawer.open(product ?? null);
  }

  function handleStatFilter(key: string) {
    if (key === 'avgPrice') return;
    _selectFilter(key);
    clearSelection();
  }

  function handleCategoryFilter(cat: string) {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
    setPage(1);
    clearSelection();
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  return (
    <>
      <ProductsPageHeader
        total={headerCounts.total}
        inStock={headerCounts.inStock}
        outOfStock={headerCounts.outOfStock}
        exporting={exporting}
        onExport={handleExport}
        onImport={() => setImportOpen(true)}
      />

      <AdminStatStrip
        cells={[
          { key: 'all',        label: 'All cuts',     meta: 'IN CATALOG',  dotClass: 'bg-muted',   value: counts.all },
          { key: 'inStock',    label: 'In Stock',     meta: 'AVAILABLE',   dotClass: 'bg-green',   value: counts.inStock },
          { key: 'outOfStock', label: 'Out of Stock', meta: 'UNAVAILABLE', dotClass: 'bg-oxblood', value: counts.outOfStock },
          { key: 'avgPrice',   label: 'Avg price',    meta: 'PER LB',      dotClass: 'bg-camel',   value: formatMoney(counts.avgPrice), clickable: false },
          { key: 'featured',   label: 'Featured',     meta: 'ON HOMEPAGE', dotClass: 'bg-camel',   value: counts.featured },
        ]}
        activeKey={activeFilter}
        onSelect={handleStatFilter}
        lastCellExtraClass="col-span-2 border-r-0 sm:border-r-0 lg:col-span-1"
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
            <AdminSortPopover
              value={sortBy}
              options={PRODUCT_SORT_OPTIONS}
              onChange={(v) => { setSortBy(v); setPage(1); }}
            />
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

        {someSelected && <ProductsBulkBar count={selectedIds.size} bulk={bulk} />}

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
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Price</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Stock</th>
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
                      onDuplicate={table.duplicate}
                      onArchive={table.archive}
                      onDelete={table.remove}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Scroll-hint fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent xl:hidden" />
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
      {drawer.isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={drawer.close}
        />
      )}

      {/* Add / Edit product drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-150 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawer.isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <ProductFormDrawer
          key={drawer.item?.id ?? 'new'}
          product={drawer.item}
          onClose={drawer.close}
          onSave={handleSave}
        />
      </aside>

      {/* CSV import drawer */}
      {importOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={() => setImportOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 right-0 w-full max-w-150 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          importOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {importOpen && (
          <ProductImportDrawer
            onClose={() => setImportOpen(false)}
            onCommitted={() => router.refresh()}
          />
        )}
      </aside>
    </>
  );
}
