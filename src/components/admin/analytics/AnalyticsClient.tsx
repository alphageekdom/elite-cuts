'use client';

import { fmtDollars } from './sections/analytics-utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AnalyticsKpiGrid from './sections/AnalyticsKpiGrid';
import AnalyticsRevenueChart from './sections/AnalyticsRevenueChart';
import AnalyticsFunnelSection from './sections/AnalyticsFunnelSection';
import AnalyticsHeatmap from './sections/AnalyticsHeatmap';

export type AnalyticsRange = '7D' | '30D' | '90D' | '1Y';

export type AnalyticsData = {
  range: AnalyticsRange;
  periodLabel: string;
  revenue: number;
  revenueChange: number;
  orderCount: number;
  aov: number;
  aovChange: number;
  pickupPct: number;
  repeatRate: number;
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
  bestSellers: {
    rank: number;
    name: string;
    image: string;
    category: string;
    sold: number;
    revenue: number;
    changePct: number;
    changeDir: 'up' | 'down';
  }[];
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
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
        }
      />

      {/* ── HEADLINE BLOCK ────────────────────────────────────────────────── */}
      <div className="bg-ink text-cream rounded-sm p-9 mb-6 relative overflow-hidden">
        <div className="absolute top-[-180px] right-[-180px] w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-end relative z-10">
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-camel-soft mb-3.5 flex items-center gap-2.5">
              <span className="w-6 h-px bg-current opacity-60" />
              Net revenue · {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <div className="font-display font-light text-[clamp(56px,7vw,96px)] leading-none tracking-[-0.04em] mb-3.5 flex items-baseline gap-3.5">
              {revWhole}
              <em className="not-italic italic text-camel text-[0.42em] ml-[-6px] font-normal">.{revFrac}</em>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[rgba(74,107,58,0.22)] text-[#B8DBA8] px-3 py-1 rounded-full text-[13px] font-medium tracking-[0.02em] font-mono">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {data.revenueChange >= 0 ? '+' : ''}{data.revenueChange.toFixed(1)}% vs previous period
            </span>
            <div className="mt-4 text-[13px] text-cream/65 font-mono tracking-[0.04em]">
              {data.orderCount} ORDERS · {aovWhole}.{aovFrac} AVG ·{' '}
              {data.pickupPct}% PICKUP / {100 - data.pickupPct}% DELIVERY
            </div>
          </div>

          <div className="h-[180px]">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B8895A" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#B8895A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="45" x2="600" y2="45" stroke="rgba(244,238,228,0.08)" strokeDasharray="2 4" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(244,238,228,0.08)" strokeDasharray="2 4" />
              <line x1="0" y1="135" x2="600" y2="135" stroke="rgba(244,238,228,0.08)" strokeDasharray="2 4" />
              <path d="M0,130 L60,125 L120,135 L180,128 L240,140 L300,118 L360,108 L420,85 L480,68 L540,42 L600,28 L600,180 L0,180 Z" fill="url(#sparkArea)" />
              <path d="M0,130 L60,125 L120,135 L180,128 L240,140 L300,118 L360,108 L420,85 L480,68 L540,42 L600,28" fill="none" stroke="#F4EEE4" strokeWidth="2" />
              <circle cx="600" cy="28" r="5" fill="#F4EEE4" stroke="#6B1F1F" strokeWidth="2" />
            </svg>
            <div className="flex justify-between mt-2 text-[10px] font-mono text-cream/45 tracking-[0.04em]">
              <span>WK 1</span><span>WK 2</span><span>WK 3</span><span>WK 4</span><span>WK 5</span>
            </div>
          </div>
        </div>
      </div>

      <AnalyticsKpiGrid data={data} />
      <AnalyticsRevenueChart data={data} />
      <AnalyticsFunnelSection data={data} />
      <AnalyticsHeatmap heatmap={data.heatmap} heatmapRevenue={data.heatmapRevenue} />
    </>
  );
}
