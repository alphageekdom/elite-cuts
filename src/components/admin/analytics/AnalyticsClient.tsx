'use client';

import { fmtDollars } from './sections/analytics-utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AnalyticsKpiGrid from './sections/AnalyticsKpiGrid';
import AnalyticsRevenueChart from './sections/AnalyticsRevenueChart';
import AnalyticsInsightsCard from './sections/AnalyticsInsightsCard';
import AnalyticsHeatmap from './sections/AnalyticsHeatmap';
import { buildSparklinePath } from '@/lib/sparkline';
import type { RangeKey } from '@/lib/admin/range-buckets';
import ChevronIcon from '@/components/ui/icons/ChevronIcon';

export type AnalyticsRange = RangeKey;

export type AnalyticsData = {
  range: AnalyticsRange;
  periodLabel: string;
  heroPeriodLabel: string;
  revenue: number;
  revenueChange: number;
  orderCount: number;
  aov: number;
  aovChange: number;
  pickupPct: number;
  repeatRate: number;
  repeatRateChange: number;
  newCustomers: number;
  newCustomersChange: number;
  cancelRate: number;
  cancelRateChange: number;
  categories: {
    name: string;
    revenue: number;
    pct: number;
    orders: number;
    color: string;
    barW: number;
  }[];
  topSellerName: string | null;
  buckets: { label: string; value: number; prevValue: number }[];
  bucketUnit: 'Day' | 'Week' | 'Biweekly' | 'Monthly';
  revenueTotal: number;
  revenuePrevTotal: number;
  heatmap: number[][];
  heatmapRevenue: number[][];
};

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const { whole: revWhole, frac: revFrac } = fmtDollars(data.revenue);
  const { whole: aovWhole, frac: aovFrac } = fmtDollars(data.aov);

  // Sparkline from the active period's bucket values. Falls back to a flat
  // baseline when every bucket is zero so the SVG still renders cleanly.
  const sparkValues = data.buckets.map((b) => b.value);
  const sparkPaths = buildSparklinePath(sparkValues, { width: 600, height: 180, padding: 24 });
  const hasSpark = sparkValues.some((v) => v > 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Insights"
        breadcrumb="Analytics"
        title="Shop"
        titleAccent="analytics"
        subtitle={data.periodLabel}
        actions={
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        }
      />

      {/* ── HEADLINE BLOCK ────────────────────────────────────────────────── */}
      <div className="bg-ink text-cream rounded-sm p-6 sm:p-9 mb-6 relative overflow-hidden">
        <div className="absolute -top-45 -right-45 w-120 h-120 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)] pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr] gap-6 sm:gap-10 items-end relative z-10">
          <div>
            <div className="text-[11px] tracking-[0.18em] lg:tracking-[0.22em] uppercase text-camel-soft mb-3.5 flex items-center gap-2.5">
              <span className="hidden lg:block w-6 h-px bg-current opacity-60" />
              Net revenue · {data.heroPeriodLabel}
            </div>
            <div className="font-display font-light text-[clamp(56px,7vw,96px)] leading-none tracking-[-0.04em] mb-3.5 flex items-baseline gap-3.5">
              {revWhole}
              <em className="italic text-camel text-[0.42em] -ml-1.5 font-normal">.{revFrac}</em>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-green/25 text-green-bright px-3 py-1 rounded-full text-[13px] font-medium tracking-[0.02em] font-mono">
              <ChevronIcon className="w-2.5 h-2.5" direction="up" strokeWidth={3} />
              {data.revenueChange >= 0 ? '+' : ''}{data.revenueChange.toFixed(1)}% vs previous
            </span>
            <div className="mt-4 text-[13px] text-cream/65 font-mono tracking-[0.04em]">
              {data.orderCount} ORDERS · {aovWhole}.{aovFrac} AVG ·{' '}
              {data.pickupPct}% PICKUP / {100 - data.pickupPct}% DELIVERY
            </div>
          </div>

          <div className="h-45">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-camel)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--color-camel)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[45, 90, 135].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke="var(--color-cream)"
                  strokeOpacity="0.08"
                  strokeDasharray="2 4"
                />
              ))}
              {hasSpark && (
                <>
                  <path d={sparkPaths.area} fill="url(#sparkArea)" />
                  <path d={sparkPaths.line} fill="none" stroke="var(--color-cream)" strokeWidth="2" />
                  {sparkPaths.endpoint && (
                    <circle
                      cx={sparkPaths.endpoint.x}
                      cy={sparkPaths.endpoint.y}
                      r="5"
                      fill="var(--color-cream)"
                      stroke="var(--color-oxblood)"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
            </svg>
            {!hasSpark && (
              <div className="mt-2 text-center text-[10px] font-mono text-cream/60 tracking-[0.04em]">
                No revenue this period
              </div>
            )}
          </div>
        </div>
      </div>

      <AnalyticsKpiGrid data={data} />
      <AnalyticsRevenueChart data={data} />
      <AnalyticsInsightsCard data={data} />
      <AnalyticsHeatmap heatmap={data.heatmap} heatmapRevenue={data.heatmapRevenue} />
    </>
  );
}
