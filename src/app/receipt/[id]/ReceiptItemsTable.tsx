import { formatMoney } from '@/lib/admin-utils';
import type { OrderItem } from '@/models/Order';

type Props = {
  orderItems: OrderItem[];
};

export default function ReceiptItemsTable({ orderItems }: Props) {
  return (
    <div className="px-8 sm:px-12">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_56px_88px] items-center py-4 border-b border-line-soft font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted">
        <span>Item</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {orderItems.map((item, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_56px_88px] items-center py-5 border-b border-line-soft last:border-b-0"
        >
          <div className="min-w-0 pr-4">
            <div className="font-display text-[17px] font-medium tracking-tight leading-snug mb-1">{item.name}</div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted tracking-[0.04em] flex-wrap">
              <span>{formatMoney(item.price)}/ea</span>
              {item.productType && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted/40 inline-block" />
                  <span className="uppercase">{item.productType}</span>
                </>
              )}
            </div>
          </div>
          <div className="font-mono text-[13px] text-ink-soft text-center">× {item.qty}</div>
          <div className="font-display text-[17px] font-medium tracking-tight text-right">
            {formatMoney(item.price * item.qty)}
          </div>
        </div>
      ))}
    </div>
  );
}
