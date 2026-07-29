import Image from 'next/image';
import Link from 'next/link';

import { formatMoney, productImageSrc } from '@/lib/format';
import { orderRef } from '@/lib/orders/reference';
import { PROFILE_ORDER_STATUS_STYLES } from '@/lib/orders/status';
import { FOCUS_RING } from '@/lib/styles';
import type { ProfileOrder } from '@/types/profile';

type Props = {
  orders: ProfileOrder[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RecentOrdersPanel({ orders }: Props) {
  return (
    <div className="rounded border border-line-soft bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] tracking-tight">
          Recent orders
        </h2>
        <Link
          href="/profile?tab=orders"
          className={`inline-flex min-h-11 items-center rounded-sm text-[13px] text-oxblood underline underline-offset-[3px] transition-colors hover:text-oxblood-deep ${FOCUS_RING} focus-visible:ring-offset-paper`}
        >
          All orders
        </Link>
      </div>

      <ul className="mt-1">
        {orders.map((order) => {
          const first = order.orderItems[0];
          const others = order.orderItems.length - 1;

          return (
            <li
              key={order._id}
              className="flex items-center gap-4 border-t border-line-soft py-3.5"
            >
              <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-cream-deep">
                {first?.image && (
                  <Image
                    src={productImageSrc(first.image) ?? ''}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] leading-snug">
                  {first?.name ?? 'Order'}
                  {others > 0 && (
                    <span className="text-muted"> +{others}</span>
                  )}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {orderRef(order._id)} · {formatDate(order.createdAt)}
                </p>
              </div>

              <span
                className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] whitespace-nowrap sm:inline-block ${PROFILE_ORDER_STATUS_STYLES[order.orderStatus]}`}
              >
                {order.orderStatus}
              </span>

              <span className="w-19 shrink-0 text-right font-display text-[18px] tabular-nums">
                {formatMoney(order.totalCost)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
