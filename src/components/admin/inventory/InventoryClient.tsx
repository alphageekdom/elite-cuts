'use client';
import { useMemo, useState } from 'react';
import { useStatFilter } from '@/hooks/useStatFilter';
import { toast } from 'sonner';
import { CATEGORY_PAR, DEFAULT_PAR } from '@/lib/inventory';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminSortPopover from '@/components/admin/AdminSortPopover';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/admin-constants';
import InventoryAgingRoom, { type AgingCutRow } from './InventoryAgingRoom';
import InventoryUpcomingDeliveries, { type DeliveryRow, type ReceivedDeliveryRow } from './InventoryUpcomingDeliveries';
import InventoryReorderDrawer from './InventoryReorderDrawer';
import InventoryTableRowComponent from './InventoryTableRow';
import InventoryPageHeader from './InventoryPageHeader';
import StocktakeDrawer from './StocktakeDrawer';

export type InventoryRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  images: string[];
  stockCount: number;
  isAged: boolean;
  supplier: string;
  createdAt: string;
  deliveryStatus: string | null;
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
  agingCuts: AgingCutRow[];
  deliveries: DeliveryRow[];
  receivedDeliveries: ReceivedDeliveryRow[];
  totalProducts: number;
  lastStocktakeLabel: string;
};

type SortBy = 'stock-asc' | 'name-asc' | 'price-desc' | 'newest';




const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'stock-asc', label: 'Lowest stock' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'newest', label: 'Newest' },
];


const PAGE_SIZE = 8;

export default function InventoryClient({
  rows,
  counts,
  categoryCounts,
  agingCuts,
  deliveries,
  receivedDeliveries,
  totalProducts,
  lastStocktakeLabel,
}: Props) {
  // localRows mirrors the `rows` prop but supports optimistic updates (see
  // setLocalRows usage in the stock-edit handler). Adjust-during-render syncs
  // it back to the server snapshot whenever the prop reference changes.
  const [localRows, setLocalRows] = useState(rows);
  const [lastRows, setLastRows] = useState(rows);
  if (lastRows !== rows) {
    setLastRows(rows);
    setLocalRows(rows);
  }

  // Snapshot of row IDs visible in the active tab — updated only when the tab changes,
  // not on stock edits, so items don't vanish mid-session when stock crosses a threshold.
  const [tabSnapshot, setTabSnapshot] = useState<Set<string>>(
    () => new Set(rows.map((r) => r.id)),
  );

  const liveCounts = useMemo(() => {
    let inStock = 0, lowStock = 0, critical = 0;
    for (const r of localRows) {
      if (r.stockCount === 0) continue;
      const par = CATEGORY_PAR[r.category] ?? DEFAULT_PAR;
      const ratio = r.stockCount / par;
      if (ratio < 0.3) critical++;
      else if (ratio < 0.7) lowStock++;
      else inStock++;
    }
    return { all: localRows.length, inStock, lowStock, critical, agingRoom: counts.agingRoom };
  }, [localRows, counts.agingRoom]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [page, setPage] = useState(1);
  const { activeKey: activeFilter, selectKey: _selectFilter } = useStatFilter<string>('all', () => setPage(1));
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('stock-asc');
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockEditValue, setStockEditValue] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  const [reorderRow, setReorderRow] = useState<InventoryRow | null>(null);
  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [logDeliveryOpen, setLogDeliveryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      // Map the current filter UI to the export endpoint's status param.
      if (activeFilter === 'inStock') params.set('status', 'in-stock');
      else if (activeFilter === 'lowStock') params.set('status', 'low-stock');
      else if (activeFilter === 'critical') params.set('status', 'critical');
      if (activeCategory) params.set('category', activeCategory);
      if (search.trim()) params.set('search', search.trim());
      const url = `/api/products/inventory/export${params.size ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        toast.error('Export failed');
        return;
      }
      // Pull the filename from Content-Disposition; fall back to a sensible default.
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? 'inventory.csv';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success('Inventory exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleStockSave(id: string) {
    const newCount = parseInt(stockEditValue, 10);
    if (isNaN(newCount) || newCount < 0) {
      toast.error('Stock must be a non-negative number');
      return;
    }
    setStockSaving(true);
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockCount: newCount }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update stock');
        return;
      }
      setLocalRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, stockCount: newCount } : r)),
      );
      setStockEditId(null);
      toast.success('Stock updated');
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setStockSaving(false);
    }
  }

  const filtered = useMemo(() => {
    // For non-'all' tabs use the snapshot so items don't vanish when stock changes mid-session.
    let list = activeFilter === 'all'
      ? localRows
      : localRows.filter((r) => tabSnapshot.has(r.id));

    if (activeCategory) {
      list = list.filter((r) => r.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.supplier ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (sortBy === 'stock-asc') sorted.sort((a, b) => a.stockCount - b.stockCount);
    else if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'newest') sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return sorted;
  }, [localRows, activeFilter, tabSnapshot, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter(f: string) {
    // Re-snapshot which rows qualify for this tab at the moment the tab is clicked.
    if (f === 'all') {
      setTabSnapshot(new Set(localRows.map((r) => r.id)));
    } else {
      const matched = localRows.filter((r) => {
        const par = CATEGORY_PAR[r.category] ?? DEFAULT_PAR;
        const ratio = r.stockCount / par;
        if (f === 'inStock') return r.stockCount > 0 && ratio >= 0.7;
        if (f === 'lowStock') return r.stockCount > 0 && ratio >= 0.3 && ratio < 0.7;
        if (f === 'critical') return r.stockCount > 0 && ratio < 0.3;
        return true;
      });
      setTabSnapshot(new Set(matched.map((r) => r.id)));
    }
    _selectFilter(f);
  }

  function handleCategory(cat: string) {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
    setPage(1);
  }

  function handleSort(s: SortBy) {
    setSortBy(s);
    setPage(1);
  }


  return (
    <div>
      <InventoryPageHeader
        totalProducts={totalProducts}
        lastStocktakeLabel={lastStocktakeLabel}
        exporting={exporting}
        onExport={handleExport}
        onRecountAll={() => setStocktakeOpen(true)}
        onLogDelivery={() => setLogDeliveryOpen(true)}
      />

      {/* Alert banner */}
      {liveCounts.critical > 0 && !alertDismissed && (
        <div className="flex items-center gap-3.5 px-6 py-4 bg-red-soft border border-[rgba(107,31,31,0.2)] rounded mb-6 text-[14px] text-ink-soft">
          <span className="w-8 h-8 rounded-full bg-oxblood text-cream grid place-items-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>
            <strong className="text-ink font-medium">{liveCounts.critical} cut{liveCounts.critical !== 1 ? 's' : ''} below reorder threshold.</strong>{' '}
            Take action now or place an order.
          </span>
          <button
            onClick={() => setAlertDismissed(true)}
            className="ml-auto text-muted hover:text-ink transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <AdminStatStrip
        cells={[
          { id: 'all-skus',   key: 'all',      label: 'All SKUs',  value: liveCounts.all,       meta: 'TRACKED',     dotClass: 'bg-muted' },
          { id: 'in-stock',   key: 'inStock',  label: 'In stock',  value: liveCounts.inStock,   meta: 'ABOVE PAR',   dotClass: 'bg-green' },
          { id: 'low-stock',  key: 'lowStock', label: 'Low stock', value: liveCounts.lowStock,  meta: 'BELOW 70%',   dotClass: 'bg-amber' },
          { id: 'critical',   key: 'critical', label: 'Critical',  value: liveCounts.critical,  meta: 'REORDER NOW', dotClass: 'bg-oxblood', badge: liveCounts.critical > 0 ? '!' : undefined },
          { id: 'aging-room', key: 'all',      label: 'Aging room',value: liveCounts.agingRoom, meta: 'IN CABINET',  dotClass: 'bg-muted', clickable: false },
        ]}
        activeKey={activeFilter}
        onSelect={handleFilter}
        lastCellExtraClass="col-span-2 border-r-0 sm:border-r-0 lg:col-span-1"
      />

      {/* Toolbar — search + sort on row 1, category chips on row 2.
          A single flex-wrap row was crowding the chips off iPad and SE. */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <AdminSearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by cut, SKU, supplier…"
            className="w-full sm:max-w-sm"
          />
          <AdminSortPopover
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={handleSort}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
      </div>

      {/* Stock table */}
      <div className="bg-paper border border-line-soft rounded overflow-hidden mb-6">
        <div className="overflow-x-auto relative">
          {/* Scroll hint gradient */}
          <div className="absolute top-0 right-0 bottom-0 w-12 bg-linear-to-l from-paper pointer-events-none z-10" />
          <table className="w-full border-collapse text-sm min-w-225">
            <thead className="bg-cream border-b border-line-soft">
              <tr>
                <th className="text-left pl-6 pr-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Cut
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Aged
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
                  Supplier
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Delivery
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
                pageRows.map((row) => (
                  <InventoryTableRowComponent
                    key={row.id}
                    row={row}
                    stockEditId={stockEditId}
                    stockEditValue={stockEditValue}
                    stockSaving={stockSaving}
                    onStockEdit={(id, val) => { setStockEditId(id); setStockEditValue(val); }}
                    onStockValueChange={setStockEditValue}
                    onStockSave={handleStockSave}
                    onStockCancel={() => setStockEditId(null)}
                    onReorder={setReorderRow}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          filteredCount={filtered.length}
          perPage={PAGE_SIZE}
          noun="cuts"
          showPerPage={false}
          onPageChange={setPage}
        />
      </div>

      {/* Two-column grid: Aging room + Deliveries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InventoryAgingRoom cuts={agingCuts} />
        <InventoryUpcomingDeliveries deliveries={deliveries} receivedDeliveries={receivedDeliveries} />
      </div>

      {reorderRow && (
        <InventoryReorderDrawer row={reorderRow} onClose={() => setReorderRow(null)} />
      )}

      {stocktakeOpen && (
        <StocktakeDrawer rows={localRows} onClose={() => setStocktakeOpen(false)} />
      )}

      {logDeliveryOpen && (
        <InventoryReorderDrawer
          row={null}
          mode="log-delivery"
          rows={localRows}
          onClose={() => setLogDeliveryOpen(false)}
        />
      )}
    </div>
  );
}
