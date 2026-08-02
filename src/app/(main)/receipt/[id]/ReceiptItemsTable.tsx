import { formatMoney } from '@/lib/format';
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

      {orderItems.map((item, i) => {
        const isRefunded = item.refunded;
        // Same reasoning as the admin order drawer: the strikethrough and the
        // Refunded pill carry this state. Dimming the whole row took the meta
        // line to 2.37:1 and the pill to 2.58:1.
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_56px_88px] items-center py-5 border-b border-line-soft last:border-b-0"
          >
            <div className="min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`font-display text-[17px] font-medium tracking-tight leading-snug ${isRefunded ? 'line-through' : ''}`}>
                  {item.name}
                </span>
                {isRefunded && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-oxblood/10 text-oxblood text-[10px] font-medium tracking-[0.04em] uppercase">
                    Refunded
                  </span>
                )}
              </div>
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
            <div className={`font-mono text-[13px] text-ink-soft text-center ${isRefunded ? 'line-through' : ''}`}>× {item.qty}</div>
            <div className={`font-display text-[17px] font-medium tracking-tight text-right ${isRefunded ? 'line-through' : ''}`}>
              {formatMoney(item.price * item.qty)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
