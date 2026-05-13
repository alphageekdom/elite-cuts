import { fmtDollarShort, fmtRank } from './analytics-utils';
import { productImageSrc } from '@/lib/format';
import type { AnalyticsData } from '../AnalyticsClient';

export default function AnalyticsBestSellersSection({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* § 03 Best sellers */}
      <div className="bg-paper border border-line-soft rounded-sm p-7">
        <div className="mb-6">
          <div className="font-display italic text-[12px] text-camel mb-1">✦ 03</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            Best <em className="italic text-oxblood font-normal">sellers</em>
          </div>
          <div className="text-[12px] text-muted mt-1">By revenue, this period</div>
        </div>

        {data.bestSellers.length === 0 ? (
          <p className="text-muted text-sm">No product data for this period.</p>
        ) : (
          <div>
            {data.bestSellers.map((p) => (
              <div
                key={p.rank}
                className="grid grid-cols-[24px_48px_1fr_auto] gap-3.5 items-center py-3.5 border-b border-line-soft last:border-b-0 first:pt-0"
              >
                <span className="font-display italic text-lg text-camel text-center">{fmtRank(p.rank)}</span>
                <div className="w-12 h-12 rounded-[4px] bg-cream-deep overflow-hidden relative shrink-0">
                  {productImageSrc(p.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImageSrc(p.image)!} alt={p.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-medium text-[14px] tracking-[-0.005em] leading-snug mb-1 truncate">{p.name}</div>
                  <div className="text-[11px] text-muted font-mono tracking-[0.04em]">
                    {p.sold} SOLD · {p.category.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-medium text-[15px] tracking-[-0.01em] mb-0.5">{fmtDollarShort(p.revenue)}</div>
                  <div className={`text-[10px] font-mono tracking-[0.02em] ${p.changeDir === 'up' ? 'text-green' : 'text-oxblood'}`}>
                    {p.changeDir === 'up' ? '↑' : '↓'} {p.changePct.toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* § 04 Customer funnel */}
      <div className="bg-paper border border-line-soft rounded-sm p-7">
        <div className="mb-6">
          <div className="font-display italic text-[12px] text-camel mb-1">✦ 04</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            Customer <em className="italic text-oxblood font-normal">funnel</em>
          </div>
          <div className="text-[12px] text-muted mt-1">Visitor → first order</div>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { step: '01', label: 'Visitors', count: 8420, pct: 100, w: 1.0, drop: null },
            { step: '02', label: 'Cut viewed', count: 5230, pct: 62.1, w: 0.62, drop: '↓37.9%' },
            { step: '03', label: 'Added to cart', count: 1840, pct: 21.9, w: 0.22, drop: '↓40.2%' },
            { step: '04', label: 'Started checkout', count: 628, pct: 7.5, w: 0.075, drop: '↓14.4%' },
            {
              step: '05',
              label: 'Order placed',
              count: data.orderCount || 324,
              pct: data.orderCount ? parseFloat(((data.orderCount / 8420) * 100).toFixed(1)) : 3.8,
              w: 0.04,
              drop: null,
            },
          ].map((s) => (
            <div key={s.step}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display font-medium text-[15px] tracking-[-0.005em] flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded-[4px]">{s.step}</span>
                  {s.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display font-medium text-lg tracking-[-0.01em]">{s.count.toLocaleString()}</span>
                  <span className="font-mono text-[11px] text-muted tracking-[0.04em]">{s.pct}%</span>
                </span>
              </div>
              <div className="h-7 bg-cream-deep rounded-[4px] overflow-hidden relative">
                <div
                  className="h-full rounded-[4px] origin-left [transform:scaleX(0)] [animation:analyticsBarGrow_1.4s_cubic-bezier(0.2,0.8,0.2,1)_forwards] bg-gradient-to-r from-oxblood to-camel"
                  style={{ '--bar-w': s.w.toString() } as React.CSSProperties}
                />
                {s.drop && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-paper border border-line text-muted px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.04em]">
                    {s.drop}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* § 05 Insights */}
      <div className="bg-gradient-to-br from-paper to-cream-deep border border-line-soft rounded-sm p-7 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)] pointer-events-none" />
        <div className="flex items-center gap-2.5 mb-5 relative">
          <span className="w-8 h-8 rounded-full bg-oxblood text-cream grid place-items-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <h3 className="font-display font-medium text-lg tracking-[-0.01em]">
            Worth <em className="italic text-oxblood">knowing</em>
          </h3>
        </div>
        <div className="flex flex-col gap-3 relative">
          {[
            {
              tag: 'up',
              body: data.bestSellers[0]
                ? `<strong>${data.bestSellers[0].name}</strong> is your top earner this period — consider featuring it.`
                : '<strong>Beef cuts</strong> are driving the majority of this period\'s revenue.',
            },
            {
              tag: 'alert',
              body: data.cancelRate > 5
                ? `<strong>Cancellation rate is ${data.cancelRate.toFixed(1)}%</strong> — higher than usual. Worth investigating.`
                : '<strong>Cancellation rate is healthy</strong> — below 5%. Keep it up.',
            },
            {
              tag: 'tip',
              body: '<strong>Cart-to-checkout is your biggest drop-off.</strong> Check for friction at guest checkout.',
            },
            {
              tag: 'up',
              body: `<strong>${data.newCustomers} new customers this period</strong>${data.newCustomersChange > 0 ? `, +${data.newCustomersChange.toFixed(0)}%` : ''} — track repeat orders over the next 30 days.`,
            },
          ].map((ins, i) => (
            <div key={i} className="flex items-start gap-3.5 px-4.5 py-3.5 bg-cream border border-line-soft rounded-sm">
              <span
                className={`font-mono text-[9px] tracking-[0.18em] uppercase px-2 py-[3px] rounded-[4px] shrink-0 mt-[1px] ${
                  ins.tag === 'up'
                    ? 'bg-green-soft text-green'
                    : ins.tag === 'alert'
                    ? 'bg-red-soft text-oxblood'
                    : 'bg-[rgba(184,137,90,0.18)] text-camel'
                }`}
              >
                {ins.tag === 'up' ? 'Up' : ins.tag === 'alert' ? 'Alert' : 'Tip'}
              </span>
              <p
                className="text-[13px] text-ink-soft leading-[1.55] flex-1 [&_strong]:text-ink [&_strong]:font-medium"
                dangerouslySetInnerHTML={{ __html: ins.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
