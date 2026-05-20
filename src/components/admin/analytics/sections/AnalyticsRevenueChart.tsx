import { fmtDollarShort } from './analytics-utils';
import type { AnalyticsData } from '../AnalyticsClient';
import RevenueCard from '../RevenueCard';
import AdminEyebrow from '@/components/admin/AdminEyebrow';

export default function AnalyticsRevenueChart({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
      <RevenueCard
        range={data.range}
        buckets={data.buckets}
        bucketUnit={data.bucketUnit}
        revenueTotal={data.revenueTotal}
        revenuePrevTotal={data.revenuePrevTotal}
        basePath="/dashboard/analytics"
        eyebrow="01"
      />

      {/* Category breakdown */}
      <div className="bg-paper border border-line-soft rounded-sm p-7">
        <div className="mb-6">
          <AdminEyebrow size="card" className="mb-1">02</AdminEyebrow>
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            By <em className="italic text-oxblood font-normal">category</em>
          </div>
          <div className="text-[12px] text-muted mt-1">Revenue by category this period</div>
        </div>

        {data.categories.length === 0 ? (
          <p className="text-muted text-sm">No order data for this period.</p>
        ) : (
          <div className="flex flex-col gap-0">
            {data.categories.map((cat) => (
              <div key={cat.name} className="py-3.5 border-b border-line-soft last:border-b-0 first:pt-0">
                <div className="flex items-center justify-between gap-2.5 mb-2">
                  <span className="font-display font-medium text-[15px] tracking-[-0.005em]">{cat.name}</span>
                  <span className="font-display font-medium text-base tracking-[-0.01em]">{fmtDollarShort(cat.revenue)}</span>
                </div>
                <div className="h-1 bg-cream-deep rounded-sm overflow-hidden mb-1.5 relative">
                  <div
                    className="h-full rounded-sm origin-left [transform:scaleX(0)] [animation:analyticsBarGrow_1.4s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                    style={{ background: cat.color, '--bar-w': cat.barW.toFixed(3) } as React.CSSProperties}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted font-mono tracking-[0.04em]">
                  <span>{cat.pct}% OF REVENUE</span>
                  <span>{cat.orders} ORDERS</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
