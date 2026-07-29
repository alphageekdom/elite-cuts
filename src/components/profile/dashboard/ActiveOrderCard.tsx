import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { orderRef } from '@/lib/orders/reference';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';
import { formatPickupWindowParts } from '@/lib/shop-settings/pickup-slots';
import { FOCUS_RING_DARK } from '@/lib/styles';
import type { ProfileOrder } from '@/types/profile';

type Props = {
  order: ProfileOrder;
  /** The shop's configured `leadTime`. Quoting a figure here rather than
      reading it is exactly how "about an hour" survived against a real 30
      minutes on five other surfaces. */
  leadTime: string;
};

// The three moments the shop actually records. The design drew four, one of
// which was "3:50 pm · We text you" — there is no SMS provider wired to this
// project, so that step is gone rather than softened. The middle step carries
// no time because nothing timestamps the start of cutting.
function buildSteps(order: ProfileOrder) {
  const isDelivery = order.fulfillmentType === 'delivery';
  const isReady =
    order.orderStatus === 'Ready for Pickup' ||
    order.orderStatus === 'Out for Delivery';

  return [
    {
      title: 'Order placed',
      done: true,
    },
    {
      title: 'In the cutting room',
      done: isReady || order.orderStatus === 'Preparing',
    },
    {
      title: isDelivery ? 'Out for delivery' : 'Ready at the counter',
      done: isReady,
    },
  ];
}

function headline(order: ProfileOrder): { lead: string; accent: string } {
  if (order.orderStatus === 'Out for Delivery') {
    return { lead: 'On its way', accent: 'to you' };
  }
  if (order.orderStatus === 'Ready for Pickup') {
    return { lead: 'Ready now', accent: 'at the counter' };
  }

  // Pre-redesign orders stored a prose slot label ("4–5p") and newer ones an
  // ISO datetime; the formatter handles both and returns a null day for the
  // legacy shape rather than inventing one.
  if (order.pickupSlot) {
    const { day, time } = formatPickupWindowParts(order.pickupSlot);
    if (day) return { lead: `${day},`, accent: time };
    if (time) return { lead: 'Pickup', accent: time };
  }
  return { lead: 'In the', accent: 'cutting room' };
}

/**
 * The order the customer is currently waiting on — the block the old profile
 * had no equivalent of at all, where the order list showed a flat row with a
 * status chip and nothing else.
 */
export default function ActiveOrderCard({ order, leadTime }: Props) {
  const { lead, accent } = headline(order);
  const steps = buildSteps(order);
  const itemCount = order.orderItems.reduce((sum, i) => sum + i.qty, 0);
  const first = order.orderItems[0];
  const others = order.orderItems.length - 1;
  const isDelivery = order.fulfillmentType === 'delivery';

  return (
    <section className="rounded bg-ink p-6 text-cream sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-camel">
            <span className="size-1.5 shrink-0 rounded-full bg-green-bright" aria-hidden />
            {order.orderStatus} · {orderRef(order._id)}
          </p>
          <h2 className="mt-3.5 font-display text-[30px] leading-[1.05] tracking-tight sm:text-[38px]">
            {lead} <em className="italic text-camel-soft">{accent}</em>
          </h2>
          <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-cream/70">
            {first?.name}
            {others > 0 && ` and ${others} more`}
            {' · '}
            {itemCount} item{itemCount === 1 ? '' : 's'}.{' '}
            {isDelivery
              ? "We'll bring it out once it's cut and wrapped."
              : `Cuts take ${formatReadyIn(leadTime)} once the counter starts them.`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-cream/55">
            Order total
          </p>
          <p className="mt-2 font-display text-[28px] tabular-nums">
            {formatMoney(order.totalCost)}
          </p>
          {/* The design put "Track order" and "Change time" here. There is no
              customer-facing way to move a pickup slot after ordering, and no
              per-order tracking page a customer can open — the receipt route
              is admin-only. The orders list is the real destination. */}
          <Link
            href="/profile?tab=orders"
            className={`mt-4 inline-flex min-h-11 items-center rounded-full border border-cream/25 px-4 py-2 text-[12.5px] text-cream/85 transition-colors hover:border-camel hover:text-camel ${FOCUS_RING_DARK}`}
          >
            All orders
          </Link>
        </div>
      </div>

      <ol className="mt-8 grid grid-cols-1 gap-5 border-t border-cream/12 pt-6 sm:grid-cols-3 sm:gap-0">
        {steps.map((step, i) => (
          <li key={step.title} className="sm:pr-5">
            <div className="flex items-center" aria-hidden>
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  step.done ? 'bg-green-bright' : 'border border-cream/25 bg-ink'
                }`}
              />
              {i < steps.length - 1 && (
                <span className="hidden h-px flex-1 bg-cream/15 sm:block" />
              )}
            </div>
            <p
              className={`mt-3 text-[14px] ${step.done ? 'text-cream' : 'text-cream/50'}`}
            >
              {step.done && <span className="sr-only">Done — </span>}
              {step.title}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
