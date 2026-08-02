'use client';
import { getInitials, formatDateTime } from '@/lib/format';
import { printReceipt } from '@/lib/orders/print-receipt';
import { TABLE_ORDER_STATUS_PILL } from '@/lib/orders/status';
import type { OrderTableRow } from '@/types/admin';
import type { OrderColumnVisibility } from '@/hooks/admin/useOrderColumns';
import DemoPill from '@/components/demo/DemoPill';

type Props = {
  order: OrderTableRow;
  avatarColor: string;
  isSelected: boolean;
  visibleColumns: OrderColumnVisibility;
  onView: (order: OrderTableRow) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function OrderTableRowComponent({
  order,
  avatarColor,
  isSelected,
  visibleColumns,
  onView,
  onToggleSelect,
  onDelete,
}: Props) {
  const pill     = TABLE_ORDER_STATUS_PILL[order.status] ?? { bg: 'bg-line-soft', text: 'text-muted', label: order.status };
  const initials = getInitials(order.customerName);
  const { day, time } = formatDateTime(order.createdAt);
  const refundedCount = order.items.filter((it) => it.refunded).length;
  const isFullyRefunded = order.paymentStatus === 'Refunded';
  const isPartiallyRefunded = order.paymentStatus === 'Partially Refunded';

  return (
    <tr
      onClick={() => onView(order)}
      className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
        isSelected ? 'bg-camel/6' : 'hover:bg-cream'
      }`}
    >
      <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select order ${order.orderRef}`}
          checked={isSelected}
          onChange={() => onToggleSelect(order.id)}
          className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
        />
      </td>

      <td className="px-4 py-4">
        <span className="font-mono text-[12px] text-ink font-medium">{order.orderRef}</span>
      </td>

      {visibleColumns.customer && (
        <td className="px-4 py-4">
          <div className="flex items-center gap-3 min-w-45">
            <div className={`w-8 h-8 rounded-full grid place-items-center font-display font-semibold text-[11px] shrink-0 ${avatarColor}`}>
              {initials}
            </div>
            <div>
              <div className="font-medium text-[14px] leading-snug inline-flex items-center gap-1.5">
                {order.customerName}
                {order.isDemo && (
                  <DemoPill title="Seeded demo account — orders clear every night by the reset cron." />
                )}
              </div>
              <div className="text-[11px] text-muted">{order.customerEmail}</div>
            </div>
          </div>
        </td>
      )}

      {visibleColumns.items && (
        <td className="px-4 py-4">
          <span className="text-[13px] text-ink-soft">
            {order.items.length} cut{order.items.length !== 1 ? 's' : ''}
            {refundedCount > 0 && (
              <span className="text-oxblood ml-1.5">· {refundedCount} refunded</span>
            )}
          </span>
        </td>
      )}

      {visibleColumns.total && (
        <td className="px-4 py-4">
          <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
            ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </td>
      )}

      {visibleColumns.status && (
        <td className="px-4 py-4">
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${pill.bg} ${pill.text}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {pill.label}
            </span>
            {(isPartiallyRefunded || isFullyRefunded) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-oxblood/10 text-oxblood text-[10px] font-medium tracking-[0.04em] uppercase whitespace-nowrap">
                {isFullyRefunded ? 'Refunded' : 'Partial refund'}
              </span>
            )}
          </div>
        </td>
      )}

      {visibleColumns.pickup && (
        <td className="px-4 py-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-soft tracking-[0.04em]">
            <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            PICKUP
          </span>
        </td>
      )}

      {visibleColumns.created && (
        <td className="px-4 py-4">
          <div className="text-[13px] text-ink-soft leading-snug">
            <div className="font-medium text-ink">{day}</div>
            <div className="text-[11px] text-muted font-mono mt-0.5">{time}</div>
          </div>
        </td>
      )}

      <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity">
          <button onClick={() => onView(order)} aria-label="View order" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button onClick={() => printReceipt(order)} aria-label="Print receipt" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
          </button>
          <button onClick={() => onDelete(order.id)} aria-label="Delete order" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:bg-red-soft hover:text-oxblood transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
