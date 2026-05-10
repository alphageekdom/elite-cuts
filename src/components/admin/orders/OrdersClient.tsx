'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useStatFilter } from '@/hooks/useStatFilter';
import OrderTableRowComponent from './OrderTableRow';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import type { OrderTableRow, StatusCounts } from '@/types/admin';
import OrderDetailDrawer from './OrderDetailDrawer';

export type { OrderTableRow, StatusCounts };

type Props = {
  orders: OrderTableRow[];
  counts: StatusCounts;
};

const STAT_CELLS = [
  { key: 'all',               label: 'All',        metaLabel: 'THIS MONTH',      dotClass: '' },
  { key: 'Order Placed',      label: 'New',         metaLabel: 'ORDER PLACED',    dotClass: '' },
  { key: 'Preparing',         label: 'Preparing',   metaLabel: 'IN PROGRESS',     dotClass: 'camel' },
  { key: 'Ready for Pickup',  label: 'Ready',       metaLabel: 'AWAITING PICKUP', dotClass: 'camel' },
  { key: 'Out for Delivery',  label: 'Delivering',  metaLabel: 'OUT FOR DELIVERY',dotClass: 'camel' },
  { key: 'Completed',         label: 'Completed',   metaLabel: 'COMPLETED',       dotClass: 'green' },
  { key: 'Cancelled',         label: 'Cancelled',   metaLabel: 'CANCELLED',       dotClass: 'oxblood' },
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

export default function OrdersClient({ orders, counts }: Props) {
  const [localOrders, setLocalOrders] = useState(orders);
  const { activeKey: activeStatus, selectKey: _selectStatus } = useStatFilter('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOrder, setDrawerOrder] = useState<OrderTableRow | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
  const [statusUpdate, setStatusUpdate] = useState<string>('');

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
    return rows;
  }, [localOrders, activeStatus, search]);

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
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === drawerOrder.id ? { ...o, status: newStatus, cancellationReason } : o)),
      );
      setDrawerOrder((prev) => (prev ? { ...prev, status: newStatus, cancellationReason } : prev));
      toast.success('Order status updated');
    } catch {
      toast.error('Failed to update order');
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
    setDrawerOrder(order);
    setStatusUpdate(order.status);
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    setDrawerOrder(null);
    document.body.style.overflow = '';
  }

  function handleStatusFilter(key: string) {
    _selectStatus(key);
    setPage(1);
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
      <AdminStatStrip
        cells={STAT_CELLS.map((cell) => {
          const count = countForKey(cell.key, counts);
          return {
            key: String(cell.key),
            label: cell.label,
            value: count,
            meta: cell.metaLabel,
            dotClass: cell.dotClass === 'green' ? 'bg-green' : cell.dotClass === 'camel' ? 'bg-camel' : cell.dotClass === 'oxblood' ? 'bg-oxblood' : 'bg-muted',
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
            <span className="inline-flex items-center gap-1.5 bg-ink text-cream border border-ink rounded-full px-3.5 py-2 text-[13px] font-medium cursor-default">
              Last 30 days
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              More filters
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              Sort: Newest
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              Columns
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
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
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Customer</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Items</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Total</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Status</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Pickup</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Date ↓</th>
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted text-sm">
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
      {drawerOrder && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Order detail drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-135 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawerOrder ? 'translate-x-0' : 'translate-x-full'
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
          />
        )}
      </aside>
    </>
  );
}
