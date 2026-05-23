import type { ReactNode } from 'react';
import ChangePill from '../../ChangePill';
import { fmtDollars } from './analytics-utils';
import type { AnalyticsData } from '../AnalyticsClient';

type KpiCardProps = {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  changeVal: number;
  changeProps?: { suffix?: string; invert?: boolean };
  footer: ReactNode;
};

function AnalyticsKpiCard({ label, icon, value, changeVal, changeProps, footer }: KpiCardProps) {
  return (
    <div className="bg-paper border border-line-soft rounded-sm px-4 py-5 sm:px-6 sm:py-5.5 hover:border-line transition-colors">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[10px] font-medium tracking-[0.14em] sm:tracking-[0.22em] uppercase text-muted">{label}</span>
        <span className="w-5 h-5 sm:w-6.5 sm:h-6.5 rounded-full bg-cream-deep text-ink-soft grid place-items-center shrink-0">
          {icon}
        </span>
      </div>
      <div className="font-display text-[32px] leading-none tracking-tight mb-2">
        {value}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <ChangePill val={changeVal} {...changeProps} />
        {footer}
      </div>
    </div>
  );
}

export default function AnalyticsKpiGrid({ data }: { data: AnalyticsData }) {
  const { whole: aovWhole, frac: aovFrac } = fmtDollars(data.aov);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <AnalyticsKpiCard
        label="Avg Order"
        icon={
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        }
        value={
          <>
            {aovWhole}
            <em className="italic text-oxblood text-base ml-0.5 font-normal">.{aovFrac}</em>
          </>
        }
        changeVal={data.aovChange}
        footer="vs previous period"
      />

      <AnalyticsKpiCard
        label="Repeat rate"
        icon={
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        }
        value={
          <>
            {data.repeatRate.toFixed(0)}
            <em className="italic text-oxblood text-base ml-0.5 font-normal">%</em>
          </>
        }
        changeVal={data.repeatRateChange}
        changeProps={{ suffix: 'pp' }}
        footer="customers ordering 2+"
      />

      <AnalyticsKpiCard
        label="New customers"
        icon={
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        }
        value={data.newCustomers}
        changeVal={data.newCustomersChange}
        footer="this period"
      />

      <AnalyticsKpiCard
        label="Cancel rate"
        icon={
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        }
        value={
          <>
            {data.cancelRate.toFixed(1)}
            <em className="italic text-oxblood text-base ml-0.5 font-normal">%</em>
          </>
        }
        changeVal={data.cancelRateChange}
        changeProps={{ invert: true }}
        footer={data.orderCount > 0 ? `${Math.round((data.cancelRate / 100) * data.orderCount)} of ${data.orderCount} orders` : 'no orders'}
      />
    </div>
  );
}
