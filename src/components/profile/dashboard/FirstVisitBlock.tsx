import Link from 'next/link';

import { FOCUS_RING_DARK } from '@/lib/styles';

type Props = {
  points: number;
  /** What that balance is genuinely worth — floored to whole redemption blocks. */
  worthDollars: number;
  /** The per-order ceiling, spelled out. Null when the shop caps nothing. */
  capNote: string | null;
};

/**
 * What Overview shows before the customer has ordered anything.
 *
 * This is the state the demo visitor always arrives in — the nightly reset
 * deletes the demo customer's orders — so it is the most-seen version of the
 * page, not an edge case. The design drew none of it.
 *
 * Four blocks each carrying their own "nothing here yet" card was the literal
 * reading of the spec, and it stacks four empty boxes in front of someone who
 * has done nothing wrong. One block that says where to start, and names the
 * points already banked, replaces the lot; the real blocks appear as soon as
 * there is anything to put in them.
 */
export default function FirstVisitBlock({
  points,
  worthDollars,
  capNote,
}: Props) {
  const hasPoints = points > 0 && worthDollars > 0;

  return (
    <section className="rounded bg-ink p-7 text-cream sm:p-9">
      <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-camel">
        No orders yet
      </p>
      <h2 className="mt-3.5 max-w-[18ch] font-display text-[30px] leading-[1.05] tracking-tight sm:text-[38px]">
        {hasPoints ? (
          <>
            You&apos;re not starting from{' '}
            <em className="italic text-camel-soft">zero.</em>
          </>
        ) : (
          <>
            Let&apos;s get you <em className="italic text-camel-soft">started.</em>
          </>
        )}
      </h2>

      <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-cream/70">
        {hasPoints ? (
          <>
            There are{' '}
            <strong className="font-medium text-cream">
              {points.toLocaleString('en-US')} points
            </strong>{' '}
            on this account — worth{' '}
            <strong className="font-medium text-cream">${worthDollars} off</strong>
            {capNote ? `, ${capNote}` : ''}. Your order history, repeat cuts and
            habits fill in from your first order.
          </>
        ) : (
          <>
            Your order history, repeat cuts and habits all fill in from your
            first order. The case is open.
          </>
        )}
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/products"
          className={`rounded-full bg-cream px-5 py-3 text-[13px] font-medium tracking-[0.02em] text-ink transition-colors hover:bg-camel-soft ${FOCUS_RING_DARK}`}
        >
          Browse the counter
        </Link>
        <Link
          href="/rewards"
          className={`rounded-full border border-cream/25 px-5 py-3 text-[13px] text-cream/85 transition-colors hover:border-camel hover:text-camel ${FOCUS_RING_DARK}`}
        >
          How rewards work
        </Link>
      </div>
    </section>
  );
}
