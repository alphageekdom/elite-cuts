type Cut = {
  name: string;
  revenue: string;
  widthPct: number;
  meta: string;
  delay: string;
};

const TOP_CUTS: Cut[] = [
  {
    name: 'Ribeye, dry-aged',
    revenue: '$12,450',
    widthPct: 100,
    meta: '142 sold · 28% of revenue',
    delay: '0.1s',
  },
  {
    name: 'Brisket, whole',
    revenue: '$9,820',
    widthPct: 79,
    meta: '98 sold · 22% of revenue',
    delay: '0.2s',
  },
  {
    name: 'Tomahawk steak',
    revenue: '$7,640',
    widthPct: 61,
    meta: '63 sold · 17% of revenue',
    delay: '0.3s',
  },
  {
    name: 'Pork belly',
    revenue: '$5,210',
    widthPct: 42,
    meta: '87 sold · 12% of revenue',
    delay: '0.4s',
  },
  {
    name: 'Lamb shank',
    revenue: '$3,890',
    widthPct: 31,
    meta: '54 sold · 9% of revenue',
    delay: '0.5s',
  },
];

export default function DashboardTopCuts() {
  return (
    <div className="bg-paper rounded-sm px-7.5 py-7 border border-line-soft">
      {/* Card head */}
      <div className="flex items-end justify-between mb-7 gap-5">
        <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
          Top <em className="italic text-oxblood font-normal">cuts</em>
        </div>
        <a
          href="#"
          className="text-ink-soft text-[13px] font-medium inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood transition-colors hover:gap-2.5"
        >
          All cuts
          <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Cut rows */}
      <div className="divide-y divide-line-soft">
        {TOP_CUTS.map((cut) => (
          <div key={cut.name} className="py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="font-display text-[16px] font-medium tracking-[-0.01em] flex-1 min-w-0 truncate">
                {cut.name}
              </span>
              <span className="font-display text-[16px] font-medium shrink-0">{cut.revenue}</span>
            </div>
            <div className="h-1 bg-cream-deep rounded-sm overflow-hidden mb-1.5">
              <div
                className="h-full bg-oxblood rounded-sm origin-left scale-x-0"
                style={{
                  animation: `dashBarGrow 1.4s cubic-bezier(0.2,0.8,0.2,1) ${cut.delay} both`,
                  width: `${cut.widthPct}%`,
                }}
              />
            </div>
            <div className="text-[12px] text-muted">{cut.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
