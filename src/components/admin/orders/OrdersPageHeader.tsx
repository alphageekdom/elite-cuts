import Link from 'next/link';

type Props = {
  totalThisMonth: number;
  pendingCount: number;
};

export default function OrdersPageHeader({ totalThisMonth, pendingCount }: Props) {
  return (
    <div className="flex items-end justify-between mb-9 gap-6 flex-wrap">
      {/* Breadcrumb */}
      <div className="w-full flex items-center gap-2 text-[12px] text-muted tracking-[0.04em] mb-1">
        <Link href="/dashboard" className="hover:text-oxblood transition-colors">
          Dashboard
        </Link>
        <svg className="w-2.5 h-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-ink">Orders</span>
      </div>

      <div>
        <div className="font-display italic text-sm text-camel mb-1.5">✦ Manage</div>
        <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-[-0.025em] mb-1">
          All <em className="italic text-oxblood not-italic">orders</em>
        </h1>
        <p className="text-muted text-sm tracking-[0.02em]">
          {totalThisMonth} orders this month · {pendingCount} need your attention
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button className="inline-flex items-center gap-2 px-[18px] py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
        <button className="inline-flex items-center gap-2 px-[18px] py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New order
        </button>
      </div>
    </div>
  );
}
