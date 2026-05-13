'use client';
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { refundSummary } from '@/lib/order-refunds';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useAdminDrawer } from '@/hooks/useAdminDrawer';
import OrderTableRowComponent from './OrderTableRow';
import OrdersPageHeader from './OrdersPageHeader';
import OrdersFilterPanel, {
  type PaymentFilter,
  type FulfillmentFilter,
} from './OrdersFilterPanel';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import RangeToggle, { type RangeKey } from '@/components/admin/analytics/RangeToggle';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import type { OrderTableRow, StatusCounts } from '@/types/admin';
import OrderDetailDrawer from './OrderDetailDrawer';

export type { OrderTableRow, StatusCounts };

type Props = {
  orders: OrderTableRow[];
  counts: StatusCounts;
  monthOrdersCount: number;
  range: RangeKey;
};

const RANGE_META_LABEL: Record<RangeKey, string> = {
  '7D': 'LAST 7 DAYS',
  '30D': 'LAST 30 DAYS',
  '90D': 'LAST 90 DAYS',
  '1Y':  'LAST YEAR',
};

type SortBy = 'newest' | 'oldest' | 'total-desc' | 'total-asc' | 'customer-asc';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
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

const STAT_CELLS = [
  { key: 'all',               label: 'All',        metaLabel: '',                dotClass: '' },
  { key: 'Order Placed',      label: 'New',         metaLabel: 'ORDER PLACED',    dotClass: '' },
  { key: 'Preparing',         label: 'Preparing',   metaLabel: 'IN PROGRESS',     dotClass: 'bg-camel' },
  { key: 'Ready for Pickup',  label: 'Ready',       metaLabel: 'AWAITING PICKUP', dotClass: 'bg-camel' },
  { key: 'Out for Delivery',  label: 'Delivering',  metaLabel: 'OUT FOR DELIVERY',dotClass: 'bg-camel' },
  { key: 'Completed',         label: 'Completed',   metaLabel: 'COMPLETED',       dotClass: 'bg-green' },
  { key: 'Cancelled',         label: 'Cancelled',   metaLabel: 'CANCELLED',       dotClass: 'bg-oxblood' },
] as const;

type StatKey = (typeof STAT_CELLS)[number]['key'];


function countForKey(key: StatKey, counts: StatusCounts): number {
  if (key === 'all')               return counts.all;
  if (key === 'Order Placed')      return counts.orderPlaced;
  if (key === 'Preparing')         return counts.preparing;
  if (key === 'Ready for Pickup')  return counts.readyForPickup;
  if (key === 'Out for Delivery')  return counts.outForDelivery;
  if (key === 'Completed')         return counts.completed;
  if (key === 'Cancelled')         return counts.cancelled;
  return 0;
}

const PAGE_SIZES = [8, 20, 50];

export default function OrdersClient({ orders, counts, monthOrdersCount, range }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openOrderId = searchParams.get('openOrder');
  const [localOrders, setLocalOrders] = useState(orders);
  // Range navigation re-renders the page server-side with a new `orders` prop.
  // Adjusting state during render (React's recommended pattern over a mirroring
  // useEffect) avoids the extra paint and the "state derived from props" smell.
  const [prevOrdersProp, setPrevOrdersProp] = useState(orders);
  if (orders !== prevOrdersProp) {
    setPrevOrdersProp(orders);
    setLocalOrders(orders);
  }

  const [page, setPage] = useState(1);
  const { activeKey: activeStatus, selectKey: _selectStatus } = useStatFilter<string>('all', () => setPage(1));
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { item: drawerOrder, isOpen: isDrawerOpen, open: _openDrawer, close: closeDrawer, setItem: setDrawerOrder } = useAdminDrawer<OrderTableRow>();
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
  const [statusUpdate, setStatusUpdate] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [exporting, setExporting] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<OrderColumnVisibility>(DEFAULT_COLUMNS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('any');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('any');

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

  const filtered = useMemo(() => {
    let rows = localOrders;
    if (activeStatus !== 'all') {
      rows = rows.filter((o) => o.status === activeStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.orderRef.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q),
      );
    }
    if (paymentFilter !== 'any') {
      rows = rows.filter((o) => o.paymentStatus === paymentFilter);
    }
    if (fulfillmentFilter !== 'any') {
      rows = rows.filter((o) => (o.fulfillmentType ?? 'pickup') === fulfillmentFilter);
    }
    const sorted = [...rows];
    if (sortBy === 'newest')         sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    else if (sortBy === 'oldest')    sorted.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    else if (sortBy === 'total-desc') sorted.sort((a, b) => b.total - a.total);
    else if (sortBy === 'total-asc')  sorted.sort((a, b) => a.total - b.total);
    else if (sortBy === 'customer-asc') sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return sorted;
  }, [localOrders, activeStatus, search, sortBy, paymentFilter, fulfillmentFilter]);

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

  async function updateOrder(newStatus: string, cancellationReason?: string) {
    if (!drawerOrder) return;
    try {
      const body: Record<string, string> = { orderStatus: newStatus };
      if (cancellationReason) body.cancellationReason = cancellationReason;
      const res = await fetch(`/api/orders/${drawerOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update order');
        return;
      }
      // Cancellation refunds every remaining line — reflect optimistically.
      const isCancelTransition = newStatus === 'Cancelled' && drawerOrder.status !== 'Cancelled';
      setLocalOrders((prev) =>
        prev.map((o) => {
          if (o.id !== drawerOrder.id) return o;
          const items = isCancelTransition
            ? o.items.map((it) => (it.refunded ? it : { ...it, refunded: true }))
            : o.items;
          const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax });
          return {
            ...o,
            status: newStatus,
            cancellationReason,
            items,
            refundedAmount: summary.refundedAmount,
            paymentStatus: isCancelTransition ? 'Refunded' : o.paymentStatus,
          };
        }),
      );
      setDrawerOrder((prev) => {
        if (!prev) return prev;
        const items = isCancelTransition
          ? prev.items.map((it) => (it.refunded ? it : { ...it, refunded: true }))
          : prev.items;
        const summary = refundSummary(items, { subtotal: prev.subtotal, tax: prev.tax });
        return {
          ...prev,
          status: newStatus,
          cancellationReason,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: isCancelTransition ? 'Refunded' : prev.paymentStatus,
        };
      });
      router.refresh();
      toast.success(isCancelTransition ? 'Order cancelled and refunded' : 'Order status updated');
    } catch {
      toast.error('Failed to update order');
    }
  }

  async function refundItem(itemIndex: number) {
    if (!drawerOrder) return;
    try {
      const res = await fetch(`/api/orders/${drawerOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundItemIndices: [itemIndex] }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to refund item');
        return;
      }
      const apply = (o: OrderTableRow): OrderTableRow => {
        const items = o.items.map((it, idx) => (idx === itemIndex ? { ...it, refunded: true } : it));
        const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax });
        const allRefunded = summary.refundedCount >= items.length;
        const cascadeCancel = allRefunded && o.status !== 'Cancelled';
        return {
          ...o,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: allRefunded ? 'Refunded' : 'Partially Refunded',
          status: cascadeCancel ? 'Cancelled' : o.status,
          cancellationReason: cascadeCancel ? undefined : o.cancellationReason,
        };
      };
      setLocalOrders((prev) => prev.map((o) => (o.id === drawerOrder.id ? apply(o) : o)));
      setDrawerOrder((prev) => (prev ? apply(prev) : prev));
      router.refresh();
      toast.success('Item refunded');
    } catch {
      toast.error('Failed to refund item');
    }
  }

  async function unrefundItem(itemIndex: number) {
    if (!drawerOrder) return;
    try {
      const res = await fetch(`/api/orders/${drawerOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unrefundItemIndices: [itemIndex] }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to undo refund');
        return;
      }
      const apply = (o: OrderTableRow): OrderTableRow => {
        const items = o.items.map((it, idx) => (idx === itemIndex ? { ...it, refunded: false } : it));
        const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax });
        const noneRefunded = summary.refundedCount === 0;
        const allRefunded = !noneRefunded && summary.refundedCount >= items.length;
        return {
          ...o,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: noneRefunded ? 'Completed' : allRefunded ? 'Refunded' : 'Partially Refunded',
        };
      };
      setLocalOrders((prev) => prev.map((o) => (o.id === drawerOrder.id ? apply(o) : o)));
      setDrawerOrder((prev) => (prev ? apply(prev) : prev));
      router.refresh();
      toast.success('Refund undone — item restored');
    } catch {
      toast.error('Failed to undo refund');
    }
  }

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

  function openDrawer(order: OrderTableRow) {
    _openDrawer(order);
    setStatusUpdate(order.status);
  }

  // Deep-link support: when arriving with ?openOrder=<id>, open that order's
  // drawer once and strip the param so a refresh doesn't reopen it. The ref
  // guard makes this idempotent under React strict-mode double-invocation
  // and any incidental re-fires from order-list mutations.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openOrderId || handledDeepLinkRef.current === openOrderId) return;
    handledDeepLinkRef.current = openOrderId;
    const target = localOrders.find((o) => o.id === openOrderId);
    if (target) {
      _openDrawer(target);
      setStatusUpdate(target.status);
    }
    router.replace(pathname);
  }, [openOrderId, localOrders, _openDrawer, pathname, router]);

  function handleStatusFilter(key: string) {
    _selectStatus(key);
    setSelectedIds(new Set());
  }

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  async function deleteOrder(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) { const { message } = await res.json(); toast.error(message ?? 'Failed to delete order'); return; }
      setLocalOrders((prev) => prev.filter((o) => o.id !== id));
      setOpenMenuId(null);
      toast.success('Order deleted');
    } catch { toast.error('Failed to delete order'); }
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  const [bulkLoading, setBulkLoading] = useState('');

  async function bulkUpdateStatus(newStatus: string) {
    const ids = [...selectedIds];
    setBulkLoading(newStatus);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: newStatus }),
          }),
        ),
      );
      setLocalOrders((prev) =>
        prev.map((o) => (selectedIds.has(o.id) ? { ...o, status: newStatus } : o)),
      );
      setSelectedIds(new Set());
      toast.success(`${ids.length} order${ids.length !== 1 ? 's' : ''} updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update some orders');
    } finally {
      setBulkLoading('');
    }
  }

  return (
    <>
      <OrdersPageHeader
        monthOrdersCount={monthOrdersCount}
        pendingCount={counts.orderPlaced}
        exporting={exporting}
        onExport={handleExport}
        onNewOrder={() => toast.info('Coming soon')}
      />

      <AdminStatStrip
        cells={STAT_CELLS.map((cell) => {
          const count = countForKey(cell.key, counts);
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
                onClick={() => bulkUpdateStatus('Preparing')}
                disabled={!!bulkLoading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'Preparing' ? 'Updating…' : 'Mark preparing'}
              </button>
              <button
                onClick={() => bulkUpdateStatus('Ready for Pickup')}
                disabled={!!bulkLoading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'Ready for Pickup' ? 'Updating…' : 'Mark ready'}
              </button>
              <button
                onClick={() => bulkUpdateStatus('Cancelled')}
                disabled={!!bulkLoading}
                className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'Cancelled' ? 'Updating…' : 'Cancel orders'}
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
                      openMenuId={openMenuId}
                      visibleColumns={visibleColumns}
                      onView={openDrawer}
                      onToggleSelect={toggleSelect}
                      onMenuToggle={setOpenMenuId}
                      onDelete={deleteOrder}
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

      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Drawer backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Order detail drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-135 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerOrder && (
          <OrderDetailDrawer
            key={drawerOrder.id}
            order={drawerOrder}
            statusUpdate={statusUpdate}
            setStatusUpdate={setStatusUpdate}
            onClose={closeDrawer}
            onUpdate={updateOrder}
            onRefundItem={refundItem}
            onUnrefundItem={unrefundItem}
          />
        )}
      </aside>
    </>
  );
}
