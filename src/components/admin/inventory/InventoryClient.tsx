'use client';
import { useMemo, useState } from 'react';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import { toast } from 'sonner';
import { CATEGORY_PAR, DEFAULT_PAR, getStockState, type InventoryRow } from '@/lib/inventory';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import SortPopover from '@/components/ui/SortPopover';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { DRAWER_WIDTH } from '@/components/admin/DrawerChrome';
import { PRODUCT_CATEGORIES } from '@/lib/admin/constants';
import InventoryAgingRoom, { type AgingCutRow } from './InventoryAgingRoom';
import InventoryUpcomingDeliveries, { type DeliveryRow, type ReceivedDeliveryRow } from './InventoryUpcomingDeliveries';
import InventoryReorderDrawer from './InventoryReorderDrawer';
import InventoryTableRowComponent from './InventoryTableRow';
import InventoryPageHeader from './InventoryPageHeader';
import StocktakeDrawer from './StocktakeDrawer';
import { downloadCsvFromUrl } from '@/lib/admin/download';

export type { InventoryRow };

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

type SortBy = 'stock-asc' | 'name-asc' | 'newest';

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
  // List state, snapshot, stock-edit, and reorder-drawer state machine live
  // in the hook; this component is purely presentational over them.
  const table = useInventoryTable(rows);

  const liveCounts = useMemo(() => {
    let inStock = 0, lowStock = 0, critical = 0;
    for (const r of table.rows) {
      const par = CATEGORY_PAR[r.category] ?? DEFAULT_PAR;
      const state = getStockState(r.stockCount, par);
      if (state === 'critical') critical++;
      else if (state === 'low') lowStock++;
      else if (state === 'healthy' || state === 'over') inStock++;
    }
    return { all: table.rows.length, inStock, lowStock, critical, agingRoom: counts.agingRoom };
  }, [table.rows, counts.agingRoom]);

  // Purely visual state stays here — page, search, sort, category, alert
  // dismissal, export-in-flight, and the two boolean modal toggles.
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [page, setPage] = useState(1);
  const { activeKey: activeFilter, selectKey: selectStatFilter } = useStatFilter<string>('all', () => setPage(1));
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('stock-asc');
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
      const ok = await downloadCsvFromUrl(url, 'inventory.csv');
      if (ok) toast.success('Inventory exported');
      else toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  const filtered = useMemo(() => {
    // For non-'all' tabs use the snapshot so items don't vanish when stock changes mid-session.
    let list = activeFilter === 'all'
      ? table.rows
      : table.rows.filter((r) => table.tabSnapshot.has(r.id));

    if (activeCategory) {
      list = list.filter((r) => r.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (sortBy === 'stock-asc') sorted.sort((a, b) => a.stockCount - b.stockCount);
    else if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return sorted;
  }, [table.rows, activeFilter, table.tabSnapshot, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter(f: string) {
    table.refreshSnapshot(f);
    selectStatFilter(f);
  }

  function handleCategory(cat: string) {
    setActiveCategory(cat);
    setPage(1);
  }

  // Category dropdown options — '' is the no-filter "All categories"
  // entry; each category carries its current count so the menu reads
  // the same as the prior pill row without dominating the toolbar
  // (matches the admin products tab pattern).
  const categoryOptions = [
    { value: '', label: `All categories (${rows.length})` },
    ...PRODUCT_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0).map((cat) => ({
      value: cat,
      label: `${cat} (${categoryCounts[cat]})`,
    })),
  ];

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
        <div className="flex items-center gap-3.5 px-6 py-4 bg-red-soft border border-oxblood/20 rounded mb-6 text-[14px] text-ink-soft">
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

      {/* Toolbar — search on the left, category + sort dropdowns on the
          right. Used to be a 2-row layout with category pills wrapping
          unevenly across 2 rows on phone + tablet; matching the admin
          products tab pattern collapses everything into one row of
          popover triggers that fit at every viewport. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <AdminSearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by cut, SKU, supplier…"
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <SortPopover
            value={activeCategory}
            options={categoryOptions}
            onChange={handleCategory}
            prefix="Category:"
            panelLabel="Category"
            align="left"
          />
          <SortPopover
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={handleSort}
          />
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
                  Category
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">
                  Stock
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
                  <td colSpan={6} className="text-center py-16 text-muted text-[14px]">
                    No cuts match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <InventoryTableRowComponent
                    key={row.id}
                    row={row}
                    stockEditId={table.stockEdit.id}
                    stockEditValue={table.stockEdit.value}
                    stockSaving={table.stockEdit.saving}
                    onStockEdit={table.stockEdit.begin}
                    onStockValueChange={table.stockEdit.setValue}
                    onStockSave={table.stockEdit.save}
                    onStockCancel={table.stockEdit.cancel}
                    onReorder={table.reorder.open}
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

      <SlideDrawer
        open={!!table.reorder.row}
        onClose={table.reorder.close}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="reorder-form-title"
      >
        {table.reorder.row && (
          <InventoryReorderDrawer row={table.reorder.row} onClose={table.reorder.close} />
        )}
      </SlideDrawer>

      <SlideDrawer
        open={stocktakeOpen}
        onClose={() => setStocktakeOpen(false)}
        widthClass={DRAWER_WIDTH.wide}
        ariaLabelledBy="stocktake-form-title"
      >
        {stocktakeOpen && (
          <StocktakeDrawer rows={table.rows} onClose={() => setStocktakeOpen(false)} />
        )}
      </SlideDrawer>

      <SlideDrawer
        open={logDeliveryOpen}
        onClose={() => setLogDeliveryOpen(false)}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="reorder-form-title"
      >
        {logDeliveryOpen && (
          <InventoryReorderDrawer
            row={null}
            mode="log-delivery"
            rows={table.rows}
            onClose={() => setLogDeliveryOpen(false)}
          />
        )}
      </SlideDrawer>
    </div>
  );
}
