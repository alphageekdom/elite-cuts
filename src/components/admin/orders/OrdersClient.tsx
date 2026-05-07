'use client';
import { useState, useMemo } from 'react';
import { getInitials, formatDateTime, statCellBorderClasses } from '@/lib/admin-utils';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import type { OrderTableRow, StatusCounts } from '@/types/admin';
import OrderDetailDrawer from './OrderDetailDrawer';

export type { OrderTableRow, StatusCounts };

type Props = {
  orders: OrderTableRow[];
  counts: StatusCounts;
};

const STAT_CELLS = [
  { key: 'all', label: 'All', metaLabel: 'THIS MONTH', dotClass: '' },
  { key: 'Pending', label: 'Pending', metaLabel: 'NEEDS ATTENTION', dotClass: '' },
  { key: 'Ready for Pickup', label: 'Ready', metaLabel: 'AWAITING PICKUP', dotClass: 'camel' },
  { key: 'Completed', label: 'Delivered', metaLabel: 'COMPLETED', dotClass: 'green' },
  { key: 'Cancelled', label: 'Cancelled', metaLabel: 'CANCELLED', dotClass: 'oxblood' },
] as const;

type StatKey = (typeof STAT_CELLS)[number]['key'];

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-line-soft', text: 'text-muted', label: 'Pending' },
  'Ready for Pickup': { bg: '', text: 'text-camel', label: 'Ready' },
  Completed: { bg: 'bg-green-soft', text: 'text-green', label: 'Delivered' },
  Cancelled: { bg: 'bg-red-soft', text: 'text-oxblood', label: 'Cancelled' },
};

function countForKey(key: StatKey, counts: StatusCounts): number {
  if (key === 'all') return counts.all;
  if (key === 'Pending') return counts.pending;
  if (key === 'Ready for Pickup') return counts.readyForPickup;
  if (key === 'Completed') return counts.completed;
  if (key === 'Cancelled') return counts.cancelled;
  return 0;
}

const PAGE_SIZE = 8;

export default function OrdersClient({ orders, counts }: Props) {
  const [activeStatus, setActiveStatus] = useState<StatKey>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOrder, setDrawerOrder] = useState<OrderTableRow | null>(null);
  const [page, setPage] = useState(1);
  const [statusUpdate, setStatusUpdate] = useState<string>('');

  const filtered = useMemo(() => {
    let rows = orders;
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
  }, [orders, activeStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  function handleStatusFilter(key: StatKey) {
    setActiveStatus(key);
    setPage(1);
    setSelectedIds(new Set());
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  return (
    <>
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-paper border border-line-soft rounded-sm mb-6 overflow-hidden">
        {STAT_CELLS.map((cell, idx) => {
          const isActive = activeStatus === cell.key;
          const count = countForKey(cell.key, counts);
          return (
            <button
              key={cell.key}
              onClick={() => handleStatusFilter(cell.key)}
              className={[
                'relative text-left px-4 py-4 sm:px-5 sm:py-5 transition-colors cursor-pointer',
                statCellBorderClasses(idx),
                isActive ? 'bg-cream' : 'hover:bg-cream',
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.18em] uppercase text-muted">{cell.label}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      cell.dotClass === 'green'
                        ? 'var(--color-green)'
                        : cell.dotClass === 'camel'
                        ? 'var(--color-camel)'
                        : cell.dotClass === 'oxblood'
                        ? 'var(--color-oxblood)'
                        : 'var(--color-muted)',
                  }}
                />
              </div>
              <div className="font-display text-[22px] sm:text-[28px] font-normal leading-none tracking-tight mb-1">
                {count}
                {cell.key === 'Pending' && count > 0 && (
                  <em className="italic text-oxblood text-[14px] ml-0.5 font-normal">new</em>
                )}
              </div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{cell.metaLabel}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        <label className="flex items-center gap-2.5 bg-paper border border-line rounded-full px-4 py-2 w-full sm:max-w-xs focus-within:border-ink transition-colors">
          <svg className="w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order #, customer, email…"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-muted min-w-0"
          />
          <span className="hidden sm:inline font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded tracking-[0.04em] shrink-0">⌘ K</span>
        </label>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-ink text-cream border border-ink rounded-full px-3.5 py-2 text-[13px] font-medium cursor-default">
              Last 30 days
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <button className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              More filters
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              Sort: Newest
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
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
              {['Mark ready', 'Print labels', 'Export', 'Cancel orders'].map((action) => (
                <button
                  key={action}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors"
                >
                  {action}
                </button>
              ))}
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
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Fulfillment</th>
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
                  pageRows.map((order, i) => {
                    const pill = STATUS_PILL[order.status] ?? { bg: 'bg-line-soft', text: 'text-muted', label: order.status };
                    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const initials = getInitials(order.customerName);
                    const { day, time } = formatDateTime(order.createdAt);
                    const isSelected = selectedIds.has(order.id);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => openDrawer(order)}
                        className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-camel/6' : 'hover:bg-cream'
                        }`}
                      >
                        <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(order.id)}
                            className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-[12px] text-ink font-medium">{order.orderRef}</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 min-w-45">
                            <div className={`w-8 h-8 rounded-full grid place-items-center font-display font-semibold text-[11px] shrink-0 ${avatarColor}`}>
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-[14px] leading-snug">{order.customerName}</div>
                              <div className="text-[11px] text-muted">{order.customerEmail}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <div
                                  key={idx}
                                  className="w-7 h-7 rounded bg-cream-deep border-2 border-paper -ml-2 first:ml-0 shrink-0 overflow-hidden"
                                >
                                  {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  ) : null}
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="font-mono text-[10px] text-ink-soft bg-cream-deep px-1.5 py-1 rounded ml-1">
                                  +{order.items.length - 3}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] text-ink-soft">
                              {order.items.length} cut{order.items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
                            ${(order.total / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${pill.bg} ${pill.text}`}
                            style={order.status === 'Ready for Pickup' ? { background: 'rgba(184,137,90,0.18)' } : undefined}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {pill.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-soft tracking-[0.04em]">
                            <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            PICKUP
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-[13px] text-ink-soft leading-snug">
                            <div className="font-medium text-ink">{day}</div>
                            <div className="text-[11px] text-muted font-mono mt-0.5">{time}</div>
                          </div>
                        </td>

                        <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDrawer(order)}
                              aria-label="View order"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button
                              aria-label="Print"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                              </svg>
                            </button>
                            <button
                              aria-label="More"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>
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
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-cream border-t border-line-soft flex-wrap gap-3">
          <div className="font-mono text-[12px] text-muted tracking-[0.04em]">
            Showing{' '}
            <strong className="text-ink font-medium">
              {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{' '}
            of <strong className="text-ink font-medium">{filtered.length}</strong> orders
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
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
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[12px] text-muted">
            <span>Per page</span>
            <select className="appearance-none bg-paper border border-line rounded-full pl-3 pr-6 py-1.5 text-[12px] text-ink font-mono cursor-pointer bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238A7F73%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-position-[right_8px_center]">
              <option>8</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

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
            order={drawerOrder}
            statusUpdate={statusUpdate}
            setStatusUpdate={setStatusUpdate}
            onClose={closeDrawer}
          />
        )}
      </aside>
    </>
  );
}
