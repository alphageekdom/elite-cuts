import Link from 'next/link';
import { CUTLIST_ORDER_STATUS_PILL } from '@/lib/orders/status';
import type { CutListRow, CutListSummary } from '@/lib/admin/cut-list';
import ArrowIcon from '@/components/uielements/ArrowIcon';

type Props = {
  rows: CutListRow[];
  summary: CutListSummary;
  /** True when any order due today stores a prose pickup slot we can't place. */
  hasUnplaceableOrders: boolean;
};

// The dashboard's operational board: what is due at the counter today, in slot
// order.
//
// NO STATUS ADVANCE HERE, DELIBERATELY. The design advanced an order by tapping
// its status chip. `PATCH /api/orders/[id]` is wrapped in `withAdminNonDemo`,
// so that control would 403 for the demo admin — who is the main person who
// ever sees this page. Unblocking demo order writes is its own parked feature
// (context/features/demo-admin-order-writes.md); until it lands, each row
// deep-links to the order drawer instead, which every admin can open.

function StatusPill({ status }: { status: string }) {
  const pill = CUTLIST_ORDER_STATUS_PILL[status] ?? {
    bg: 'bg-cream/10',
    text: 'text-cream/75',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-medium ${pill.bg} ${pill.text}`}
    >
      {pill.label}
    </span>
  );
}

function DemoPill() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber/25 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-camel-soft">
      Demo
    </span>
  );
}

function SlotCell({ row }: { row: CutListRow }) {
  return (
    <div className="shrink-0">
      <div
        className={`font-mono text-[14px] ${row.overdue ? 'text-camel-soft' : 'text-cream'}`}
      >
        {row.slotLabel}
      </div>
      {/* Just the countdown. "· overdue" used to be appended here and wrapped
          onto three lines in the narrow mobile column; the lateness is carried
          by its own pill beside the status, where attention already goes. */}
      <div
        className={`mt-1 font-mono text-[10.5px] whitespace-nowrap ${
          row.overdue ? 'text-camel-soft' : 'text-cream/55'
        }`}
      >
        {row.countdown}
      </div>
    </div>
  );
}

function OverduePill() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-camel/20 px-2.5 py-1 text-[11px] font-medium text-camel-soft">
      Overdue
    </span>
  );
}

function OrderCell({ row }: { row: CutListRow }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-cream/10 px-2 py-0.5 font-mono text-[11px] text-cream/70">
          {row.orderRef}
        </span>
        {/* The name, whoever gave it. A guest order still carries the contact
            typed at checkout — showing "Guest" instead threw that away and
            disagreed with the recent-orders table directly below. `isGuest`
            marks the missing account, it does not replace the person. */}
        <span className="text-[14px] text-cream">{row.customerName}</span>
        {row.isGuest && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream/55">
            no account
          </span>
        )}
        {row.isDemo && <DemoPill />}
      </div>
      {row.orderNotes && (
        <p className="mt-1.5 text-[12.5px] italic text-cream/50">{row.orderNotes}</p>
      )}
    </>
  );
}

export default function DashboardCutList({ rows, summary, hasUnplaceableOrders }: Props) {
  const stats: { label: string; value: string }[] = [
    { label: 'ON THE BOARD', value: String(summary.total) },
    { label: 'STILL TO CUT', value: String(summary.outstanding) },
    // Not "collected": a completed delivery was never collected by anyone.
    // `Completed` is the status these rows actually carry.
    { label: 'COMPLETED', value: `${summary.done} / ${summary.total}` },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-sm bg-ink text-cream">
      {/* Head */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-6 pb-5 pt-6 md:px-7.5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-camel">
            <span className="h-1.5 w-1.5 rounded-full bg-green-bright" aria-hidden="true" />
            Cutting room · today
          </div>
          <h2 className="mt-3 font-display text-[26px] leading-tight tracking-[-0.02em] md:text-[30px]">
            Today&apos;s <em className="italic font-normal text-camel">cut list</em>
          </h2>
        </div>

        {summary.total > 0 && (
          <dl className="flex items-center gap-6 sm:gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-right">
                <dt className="font-mono text-[9.5px] tracking-[0.16em] text-cream/50">
                  {s.label}
                </dt>
                <dd className="mt-1.5 font-display text-[24px] text-cream">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="border-t border-cream/10 px-6 py-12 text-center md:px-7.5">
          <p className="font-display text-[19px] text-cream/85">Nothing due today.</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-cream/55">
            No order has a pickup window booked for today. New orders appear here as
            soon as a customer picks a slot at checkout.
          </p>
        </div>
      ) : (
        <>
          {/* Column heads — desktop only; the mobile cards label themselves */}
          <div className="hidden grid-cols-[92px_1fr_minmax(0,1.1fr)_176px] gap-4 border-t border-cream/10 px-7.5 pb-2.5 pt-3.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-cream/55 lg:grid">
            <span>Slot</span>
            <span>Order</span>
            <span>Cuts</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="border-t border-cream/10 lg:border-t-0">
            {rows.map((row) => (
              <li key={row.id} className="border-t border-cream/10 first:border-t-0 lg:first:border-t">
                {/* `includeDemo` matters: the orders page excludes the demo
                    customer unless asked, and its deep-link handler only opens
                    a drawer for an order that is in the loaded list — when it
                    isn't, it strips the param and silently does nothing. Since
                    this board deliberately shows demo rows, their links have to
                    turn that filter on or they lead nowhere. */}
                <Link
                  href={`/dashboard/orders?openOrder=${row.id}${
                    row.isDemo ? '&includeDemo=true' : ''
                  }`}
                  className={`block px-6 py-4 transition-colors hover:bg-cream/5 focus-visible:bg-cream/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-camel md:px-7.5 lg:grid lg:grid-cols-[92px_1fr_minmax(0,1.1fr)_176px] lg:items-center lg:gap-4 ${
                    row.stage === 'done' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Below lg the four columns don't fit, so the row stacks:
                      slot + status on one line, then who it's for, then the
                      cuts. `lg:contents` hands the children straight to the
                      grid above once there is room for all four. */}
                  <div className="flex items-start justify-between gap-3 lg:contents">
                    <SlotCell row={row} />

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 lg:order-4 lg:justify-end">
                      {row.overdue && <OverduePill />}
                      <StatusPill status={row.orderStatus} />
                    </div>
                  </div>

                  <div className="mt-2.5 min-w-0 lg:order-2 lg:mt-0">
                    <OrderCell row={row} />
                  </div>

                  <p className="mt-1.5 min-w-0 text-[13px] leading-snug text-cream/70 lg:order-3 lg:mt-0 lg:text-[13.5px]">
                    {row.cuts}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Foot */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-cream/10 px-6 py-5 md:px-7.5">
        <p className="max-w-xl text-[12.5px] leading-relaxed text-cream/55">
          {hasUnplaceableOrders
            ? 'Orders booked through the counter can be saved without a dated pickup window, and those cannot be placed on the board.'
            : 'Slots come from the pickup windows set in Settings. Open an order for its full detail.'}
        </p>
        {/* Padding pulled back by an equal negative margin: the hit area grows
            to a comfortable tap size while the text stays where it was. */}
        <Link
          href="/dashboard/orders"
          className="-my-3 inline-flex items-center gap-1.5 rounded-sm py-3 text-[13px] text-camel underline decoration-from-font underline-offset-4 transition-colors hover:text-camel-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camel"
        >
          Open the full board
          <ArrowIcon className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
