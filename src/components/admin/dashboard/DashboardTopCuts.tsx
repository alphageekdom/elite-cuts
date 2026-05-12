import Link from 'next/link';

type Cut = {
  name: string;
  revenue: number;
  sold: number;
  widthPct: number;
};

type Props = { cuts: Cut[] };

export default function DashboardTopCuts({ cuts }: Props) {
  return (
    <div className="bg-paper rounded-sm px-7.5 py-7 border border-line-soft">
      <div className="flex items-end justify-between mb-7 gap-5">
        <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
          Top <em className="italic text-oxblood font-normal">cuts</em>
        </div>
        <Link
          href="/dashboard/products"
          className="text-ink-soft text-[13px] font-medium inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood transition-colors hover:gap-2.5"
        >
          All cuts
          <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {cuts.length === 0 ? (
        <p className="text-muted text-[13px] py-8 text-center">No orders yet this month.</p>
      ) : (
        <div className="divide-y divide-line-soft">
          {cuts.map((cut, i) => (
            <div key={cut.name} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="font-display text-[16px] font-medium tracking-[-0.01em] flex-1 min-w-0 truncate">
                  {cut.name}
                </span>
                <span className="font-display text-[16px] font-medium shrink-0">
                  ${cut.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-1 bg-cream-deep rounded-sm overflow-hidden mb-1.5">
                <div
                  className="h-full bg-oxblood rounded-sm origin-left scale-x-0"
                  style={{
                    animation: `dashBarGrow 1.4s cubic-bezier(0.2,0.8,0.2,1) ${(i + 1) * 0.1}s both`,
                    width: `${cut.widthPct}%`,
                  }}
                />
              </div>
              <div className="text-[12px] text-muted">{cut.sold} sold</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
