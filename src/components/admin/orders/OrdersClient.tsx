'use client';
import { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useOrdersTable } from '@/hooks/useOrdersTable';
import OrderTableRowComponent from './OrderTableRow';
import OrdersPageHeader from './OrdersPageHeader';
import OrdersFilterPanel from './OrdersFilterPanel';
import OrderCreateDrawer, {
  type AdminOrderCustomer,
  type AdminOrderProduct,
} from './OrderCreateDrawer';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import RangeToggle, { type RangeKey } from '@/components/admin/analytics/RangeToggle';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import type { OrderTableRow, StatusCounts } from '@/types/admin';
import {
  applyOrdersFilter,
  countForOrderStat,
  type OrderSortMode,
  type OrderStatKey,
  type PaymentFilter,
  type FulfillmentFilter,
} from '@/lib/admin-orders';
import OrderDetailDrawer from './OrderDetailDrawer';

export type { OrderTableRow, StatusCounts, AdminOrderCustomer, AdminOrderProduct };

type Props = {
  orders: OrderTableRow[];
  counts: StatusCounts;
  monthOrdersCount: number;
  range: RangeKey;
  customers: AdminOrderCustomer[];
  products: AdminOrderProduct[];
  defaultPickupLocation: string;
};

const RANGE_META_LABEL: Record<RangeKey, string> = {
  '7D': 'LAST 7 DAYS',
  '30D': 'LAST 30 DAYS',
  '90D': 'LAST 90 DAYS',
  '1Y':  'LAST YEAR',
};

const SORT_OPTIONS: { value: OrderSortMode; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'total-desc', label: 'Total: High → Low' },
  { value: 'total-asc', label: 'Total: Low → High' },
  { value: 'customer-asc', label: 'Customer: A → Z' },
];

type ColumnKey = 'customer' | 'status' | 'items' | 'total' | 'pickup' | 'created';

export type OrderColumnVisibility = Record<ColumnKey, boolean>;

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'status',   label: 'Status' },
  { key: 'items',    label: 'Items' },
  { key: 'total',    label: 'Total' },
  { key: 'pickup',   label: 'Pickup' },
  { key: 'created',  label: 'Created' },
];

const DEFAULT_COLUMNS: OrderColumnVisibility = {
  customer: true,
  status: true,
  items: true,
  total: true,
  pickup: true,
  created: true,
};

const COLUMNS_STORAGE_KEY = 'admin.orders.columns';

// useLayoutEffect runs synchronously after DOM mutation but before paint, which
// lets us apply the persisted column preference without a visible flash.
// Fall back to useEffect on the server so React doesn't emit a no-op warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const STAT_CELLS: { key: OrderStatKey; label: string; metaLabel: string; dotClass: string }[] = [
  { key: 'all',               label: 'All',        metaLabel: '',                dotClass: '' },
  { key: 'Order Placed',      label: 'New',         metaLabel: 'ORDER PLACED',    dotClass: '' },
  { key: 'Preparing',         label: 'Preparing',   metaLabel: 'IN PROGRESS',     dotClass: 'bg-camel' },
  { key: 'Ready for Pickup',  label: 'Ready',       metaLabel: 'AWAITING PICKUP', dotClass: 'bg-camel' },
  { key: 'Out for Delivery',  label: 'Delivering',  metaLabel: 'OUT FOR DELIVERY',dotClass: 'bg-camel' },
  { key: 'Completed',         label: 'Completed',   metaLabel: 'COMPLETED',       dotClass: 'bg-green' },
  { key: 'Cancelled',         label: 'Cancelled',   metaLabel: 'CANCELLED',       dotClass: 'bg-oxblood' },
];

const PAGE_SIZES = [8, 20, 50];

export default function OrdersClient({ orders, counts, monthOrdersCount, range, customers, products, defaultPickupLocation }: Props) {
  const router = useRouter();
  const table = useOrdersTable(orders);

  const [page, setPage] = useState(1);
  const { activeKey: activeStatus, selectKey: _selectStatus } = useStatFilter<string>('all', () => setPage(1));
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
  const [sortBy, setSortBy] = useState<OrderSortMode>('newest');
  const [exporting, setExporting] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<OrderColumnVisibility>(DEFAULT_COLUMNS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('any');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('any');
  const [createOpen, setCreateOpen] = useState(false);

  const activeFilterCount =
    (paymentFilter === 'any' ? 0 : 1) + (fulfillmentFilter === 'any' ? 0 : 1);

  // Hydrate column visibility from localStorage before first paint. Unknown /
  // stale keys are ignored so a schema change can't lock a column off invisibly.
  useIsomorphicLayoutEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<OrderColumnVisibility>;
      const next: OrderColumnVisibility = { ...DEFAULT_COLUMNS };
      for (const { key } of COLUMN_OPTIONS) {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key]!;
      }
      setVisibleColumns(next);
    } catch {
      // Bad JSON — fall back to defaults silently.
    }
  }, []);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Never let the admin hide every toggleable column — would leave an empty grid.
      const anyVisible = COLUMN_OPTIONS.some((c) => next[c.key]);
      if (!anyVisible) return prev;
      try {
        window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota/privacy-mode failures — visibility still applies in memory.
      }
      return next;
    });
  }

  const filtered = useMemo(
    () =>
      applyOrdersFilter(
        table.orders,
        {
          status: activeStatus,
          search,
          payment: paymentFilter,
          fulfillment: fulfillmentFilter,
        },
        sortBy,
      ),
    [table.orders, activeStatus, search, sortBy, paymentFilter, fulfillmentFilter],
  );

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('range', range);
      if (activeStatus !== 'all') params.set('status', String(activeStatus));
      if (search.trim()) params.set('search', search.trim());
      if (paymentFilter !== 'any') params.set('payment', paymentFilter);
      if (fulfillmentFilter !== 'any') params.set('fulfillment', fulfillmentFilter);
      const url = `/api/orders/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        toast.error('Export failed');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? 'orders.csv';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success('Orders exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const { selectedIds } = table.selection;
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll(checked: boolean) {
    table.selection.setSelection(checked ? pageRows.map((r) => r.id) : []);
  }

  function handleStatusFilter(key: string) {
    _selectStatus(key);
    table.selection.clearSelection();
  }

  return (
    <>
      <OrdersPageHeader
        monthOrdersCount={monthOrdersCount}
        pendingCount={counts.orderPlaced}
        exporting={exporting}
        onExport={handleExport}
        onNewOrder={() => setCreateOpen(true)}
      />

      <AdminStatStrip
        cells={STAT_CELLS.map((cell) => {
          const count = countForOrderStat(cell.key, counts);
          return {
            key: String(cell.key),
            label: cell.label,
            value: count,
            meta: cell.key === 'all' ? RANGE_META_LABEL[range] : cell.metaLabel,
            dotClass: cell.dotClass || undefined,
            badge: cell.key === 'Order Placed' && count > 0 ? 'new' : undefined,
          };
        })}
        activeKey={String(activeStatus)}
        onSelect={handleStatusFilter}
        cols="grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        <AdminSearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by order #, customer, email…"
          className="w-full sm:max-w-xs"
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <RangeToggle active={range} basePath="/dashboard/orders" variant="standalone" />
            <div className="relative">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
              >
                More filters
                {activeFilterCount > 0 && (
                  <span className="bg-ink text-cream text-[10px] font-medium tracking-[0.04em] px-1.5 py-0.5 rounded-full leading-none">
                    {activeFilterCount}
                  </span>
                )}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              {filtersOpen && (
                <OrdersFilterPanel
                  payment={paymentFilter}
                  fulfillment={fulfillmentFilter}
                  onPaymentChange={(v) => { setPaymentFilter(v); setPage(1); }}
                  onFulfillmentChange={(v) => { setFulfillmentFilter(v); setPage(1); }}
                  onClear={() => {
                    setPaymentFilter('any');
                    setFulfillmentFilter('any');
                    setPage(1);
                  }}
                  onClose={() => setFiltersOpen(false)}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center bg-paper border border-line rounded-full hover:border-ink transition-colors">
              <span className="pl-3.5 pr-1 text-[13px] text-ink-soft pointer-events-none whitespace-nowrap">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as OrderSortMode); setPage(1); }}
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
            <div className="relative">
              <button
                onClick={() => setColumnsOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
              >
                Columns
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              {columnsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setColumnsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-paper border border-line rounded-lg shadow-xl py-1.5">
                    <div className="px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
                      Show columns
                    </div>
                    {COLUMN_OPTIONS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-cream cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="w-3.5 h-3.5 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table wrapper */}
      <div className="bg-paper border border-line-soft rounded-sm overflow-hidden">

        {/* Bulk bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-6 py-3 bg-ink text-cream">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="bg-camel text-ink text-[12px] font-medium px-2 py-0.5 rounded-full">{selectedIds.size}</span>
              selected
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => table.bulk.updateStatus('Preparing')}
                disabled={!!table.bulk.loading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {table.bulk.loading === 'Preparing' ? 'Updating…' : 'Mark preparing'}
              </button>
              <button
                onClick={() => table.bulk.updateStatus('Ready for Pickup')}
                disabled={!!table.bulk.loading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {table.bulk.loading === 'Ready for Pickup' ? 'Updating…' : 'Mark ready'}
              </button>
              <button
                onClick={() => table.bulk.updateStatus('Cancelled')}
                disabled={!!table.bulk.loading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {table.bulk.loading === 'Cancelled' ? 'Updating…' : 'Cancel orders'}
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] min-w-215">
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
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Order</th>
                  {visibleColumns.customer && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Customer</th>}
                  {visibleColumns.items && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Items</th>}
                  {visibleColumns.total && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Total</th>}
                  {visibleColumns.status && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Status</th>}
                  {visibleColumns.pickup && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Pickup</th>}
                  {visibleColumns.created && <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Date ↓</th>}
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={3 + COLUMN_OPTIONS.filter((c) => visibleColumns[c.key]).length} className="text-center py-16 text-muted text-sm">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((order, i) => (
                    <OrderTableRowComponent
                      key={order.id}
                      order={order}
                      avatarColor={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                      isSelected={selectedIds.has(order.id)}
                      openMenuId={table.menu.openId}
                      visibleColumns={visibleColumns}
                      onView={table.drawer.open}
                      onToggleSelect={table.selection.toggleSelect}
                      onMenuToggle={table.menu.setOpenId}
                      onDelete={table.actions.deleteOrder}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          filteredCount={filtered.length}
          perPage={perPage}
          pageSizes={PAGE_SIZES}
          noun="orders"
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      </div>

      {table.menu.openId && (
        <div className="fixed inset-0 z-10" onClick={() => table.menu.setOpenId(null)} />
      )}

      {/* Drawer backdrop */}
      {table.drawer.isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={table.drawer.close}
        />
      )}

      {/* Order detail drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-135 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          table.drawer.isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {table.drawer.item && (
          <OrderDetailDrawer
            key={table.drawer.item.id}
            order={table.drawer.item}
            statusUpdate={table.statusUpdate}
            setStatusUpdate={table.setStatusUpdate}
            onClose={table.drawer.close}
            onUpdate={table.actions.updateOrder}
            onRefundItem={table.actions.refundItem}
            onUnrefundItem={table.actions.unrefundItem}
          />
        )}
      </aside>

      {/* New order create drawer */}
      {createOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={() => setCreateOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 right-0 w-full max-w-135 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          createOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {createOpen && (
          <OrderCreateDrawer
            customers={customers}
            products={products}
            defaultPickupLocation={defaultPickupLocation}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        )}
      </aside>
    </>
  );
}
