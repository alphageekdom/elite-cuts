import Image from 'next/image';
import Link from 'next/link';
import type { ProfileOrder } from '@/app/(main)/profile/page';
import type { OrderStatus } from '@/models/Order';

type Props = {
  orders: ProfileOrder[];
  showAll?: boolean;
};

function statusChip(status: OrderStatus): string {
  switch (status) {
    case 'Completed':       return 'bg-green/10 text-green';
    case 'Ready for Pickup': return 'bg-camel/15 text-camel';
    case 'Cancelled':       return 'bg-oxblood/10 text-oxblood';
    default:                return 'bg-ink/8 text-muted';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortId(id: string): string {
  return `#EC-${id.slice(-4).toUpperCase()}`;
}

export default function ProfileOrderList({ orders, showAll = false }: Props) {
  const displayed = showAll ? orders : orders.slice(0, 3);

  if (orders.length === 0) {
    return (
      <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
        <div className="w-14 h-14 rounded-full bg-cream-deep text-ink-soft flex items-center justify-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        </div>
        <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">No orders yet</h3>
        <p className="text-muted text-sm mb-6 max-w-[32ch] mx-auto">
          Place your first order and it&apos;ll appear here.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3 rounded-full hover:bg-oxblood transition-colors"
        >
          Shop the counter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayed.map((order) => {
        const first = order.orderItems[0];
        const itemCount = order.orderItems.reduce((s, i) => s + i.qty, 0);
        const extra = order.orderItems.length > 1 ? ` + ${order.orderItems.length - 1} more` : '';

        return (
          <div
            key={order._id}
            className="bg-paper border border-line-soft rounded px-5 py-5 grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_auto] gap-4 md:gap-5 items-center transition-all duration-300 hover:border-line hover:translate-x-1"
          >
            {/* Image */}
            {first?.image ? (
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded shrink-0 overflow-hidden">
                <Image
                  src={`/images/products/${first.image}`}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded shrink-0 bg-cream-deep" />
            )}

            {/* Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-[11px] text-ink-soft bg-cream-deep px-2 py-0.5 rounded">
                  {shortId(order._id)}
                </span>
                <span className="text-[11px] tracking-[0.14em] uppercase text-muted">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <p className="font-display font-medium text-[18px] md:text-[20px] tracking-tight mb-0.5 truncate">
                {first?.name ?? 'Order'}
              </p>
              <p className="text-[13px] text-muted truncate">
                {itemCount} item{itemCount !== 1 ? 's' : ''}{extra}
              </p>
            </div>

            {/* Status + price — stack on mobile, inline on md */}
            <div className="col-span-2 md:col-span-1 flex items-center justify-between md:contents gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${statusChip(order.orderStatus)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {order.orderStatus}
              </span>
              <p className="font-display font-medium text-[20px] md:text-[22px] text-right">
                ${order.totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
