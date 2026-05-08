import ChangePill from '../ChangePill';
import { fmtDollars } from './analytics-utils';
import type { AnalyticsData } from './AnalyticsClient';

export default function AnalyticsKpiGrid({ data }: { data: AnalyticsData }) {
  const { whole: aovWhole, frac: aovFrac } = fmtDollars(data.aov);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Avg Order Value */}
      <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Avg Order</span>
          <span className="w-6.5 h-6.5 rounded-full bg-cream-deep text-ink-soft grid place-items-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </span>
        </div>
        <div className="font-display text-[32px] leading-none tracking-[-0.025em] mb-2">
          {aovWhole}<em className="not-italic italic text-oxblood text-base ml-0.5 font-normal">.{aovFrac}</em>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <ChangePill val={data.aovChange} />
          vs last month
        </div>
      </div>

      {/* Repeat Purchase */}
      <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Repeat rate</span>
          <span className="w-6.5 h-6.5 rounded-full bg-cream-deep text-ink-soft grid place-items-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </span>
        </div>
        <div className="font-display text-[32px] leading-none tracking-[-0.025em] mb-2">
          {data.repeatRate.toFixed(0)}<em className="not-italic italic text-oxblood text-base ml-0.5 font-normal">%</em>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[rgba(28,24,20,0.06)] text-muted font-medium text-[11px] font-mono">–</span>
          customers ordering 2+
        </div>
      </div>

      {/* New Customers */}
      <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">New customers</span>
          <span className="w-6.5 h-6.5 rounded-full bg-cream-deep text-ink-soft grid place-items-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </span>
        </div>
        <div className="font-display text-[32px] leading-none tracking-[-0.025em] mb-2">
          {data.newCustomers}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <ChangePill val={data.newCustomersChange} />
          this month
        </div>
      </div>

      {/* Cancellation Rate */}
      <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Cancel rate</span>
          <span className="w-6.5 h-6.5 rounded-full bg-cream-deep text-ink-soft grid place-items-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </span>
        </div>
        <div className="font-display text-[32px] leading-none tracking-[-0.025em] mb-2">
          {data.cancelRate.toFixed(1)}<em className="not-italic italic text-oxblood text-base ml-0.5 font-normal">%</em>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <ChangePill val={data.cancelRateChange} invert />
          {data.orderCount > 0 ? `${Math.round((data.cancelRate / 100) * data.orderCount)} of ${data.orderCount} orders` : 'no orders'}
        </div>
      </div>
    </div>
  );
}
