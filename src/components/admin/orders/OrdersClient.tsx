'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useOrdersTable } from '@/hooks/useOrdersTable';
import { useOrderColumns, ORDER_COLUMN_OPTIONS, type OrderColumnVisibility } from '@/hooks/useOrderColumns';
import OrderTableRowComponent from './OrderTableRow';
import OrdersPageHeader from './OrdersPageHeader';
import OrdersFilterPanel from './OrdersFilterPanel';
import OrdersColumnsPopover from './OrdersColumnsPopover';
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
  buildOrderExportParams,
  countForOrderStat,
  ORDER_RANGE_META_LABEL,
  ORDER_SORT_OPTIONS,
  ORDER_STAT_CELLS,
  type OrderSortMode,
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
  const { columns: visibleColumns, toggle: toggleColumn } = useOrderColumns();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('any');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('any');
  const [createOpen, setCreateOpen] = useState(false);

  const activeFilterCount =
    (paymentFilter === 'any' ? 0 : 1) + (fulfillmentFilter === 'any' ? 0 : 1);

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
      const params = buildOrderExportParams({
        range,
        status: activeStatus,
        search,
        payment: paymentFilter,
        fulfillment: fulfillmentFilter,
      });
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
        cells={ORDER_STAT_CELLS.map((cell) => {
          const count = countForOrderStat(cell.key, counts);
          return {
            key: String(cell.key),
            label: cell.label,
            value: count,
            meta: cell.key === 'all' ? ORDER_RANGE_META_LABEL[range] : cell.metaLabel,
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
                {ORDER_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="w-3 h-3 text-muted absolute right-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <OrdersColumnsPopover visibleColumns={visibleColumns} onToggle={toggleColumn} />
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
                    <td colSpan={3 + ORDER_COLUMN_OPTIONS.filter((c) => visibleColumns[c.key]).length} className="text-center py-16 text-muted text-sm">
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
            onSetRealizedWeight={table.actions.setRealizedWeight}
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
