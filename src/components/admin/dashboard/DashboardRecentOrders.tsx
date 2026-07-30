'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInitials, formatMoney, avatarColorForId } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin/constants';
import {
  DASHBOARD_ORDER_STATUS_STYLES,
  getDashboardOrderStatusLabel,
} from '@/lib/orders/status';
import type { OrderRow } from '@/types/admin';
export type { OrderRow };


type Props = {
  orders: OrderRow[];
};

export default function DashboardRecentOrders({ orders }: Props) {
  const router = useRouter();

  // The sibling tables gate their scroll-hint on a viewport breakpoint, which
  // cannot work here: this card sits in a two-column grid above `lg` and runs
  // full-width below it, so the space it gets does not track the viewport.
  // Measured, the table fits at 1009px and at 935px but overflows at 805px —
  // a static breakpoint would show the fade where nothing scrolls, or hide it
  // where something does. So ask the element itself.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [orders]);

  return (
    <div className="bg-paper rounded-sm px-7.5 py-7 border border-line-soft">
      {/* Card head */}
      <div className="flex items-end justify-between mb-7 gap-5">
        <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
          Recent <em className="italic text-oxblood font-normal">orders</em>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-ink-soft text-[13px] font-medium inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood transition-colors hover:gap-2.5"
        >
          All orders
          <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">No orders yet.</p>
      ) : (
        <div className="relative -mx-2.5">
          <div ref={scrollerRef} className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr>
                {['Order', 'Customer', 'Cut', 'Status', 'Total', ''].map((h) => (
                  <th
                    key={h}
                    className={`text-left py-3 px-2.5 text-[11px] font-medium tracking-[0.22em] uppercase text-muted border-b border-line ${
                      h === 'Total' || h === '' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const avatarColor = avatarColorForId(order.id, AVATAR_COLORS);
                const initials = getInitials(order.customerName);
                const statusStyle = DASHBOARD_ORDER_STATUS_STYLES[order.status] ?? 'bg-line-soft text-ink-soft';
                const statusLabel = getDashboardOrderStatusLabel(order.status);

                return (
                  <tr key={order.id} className="group">
                    <td className="py-[18px] px-2.5 border-b border-line-soft">
                      <span className="font-mono text-[12px] text-ink-soft bg-cream-deep px-2 py-1 rounded inline-block">
                        {order.orderRef}
                      </span>
                    </td>
                    <td className="py-[18px] px-2.5 border-b border-line-soft">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full grid place-items-center font-display font-semibold text-[12px] shrink-0 ${avatarColor}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-[14px]">{order.customerName}</div>
                          <div className="text-[12px] text-muted">{order.customerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-[18px] px-2.5 border-b border-line-soft text-ink-soft">
                      {order.cut}
                    </td>
                    <td className="py-[18px] px-2.5 border-b border-line-soft">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${statusStyle}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-[18px] px-2.5 border-b border-line-soft text-right">
                      <span className="font-display text-[16px] font-medium">
                        {formatMoney(order.total)}
                      </span>
                    </td>
                    <td className="py-[18px] px-2.5 border-b border-line-soft text-right">
                      <button
                        onClick={() => router.push(`/dashboard/orders?openOrder=${order.id}`)}
                        aria-label="View order"
                        className="w-7.5 h-7.5 rounded-full bg-transparent border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream transition-colors"
                      >
                        <svg className="w-3.25 h-3.25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {scrollable && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
