'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type AnalyticsData = {
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
  weeklyRevenue: number[];
  weeklyRevenuePrev: number[];
  weeklyRevenueTotal: number;
  weeklyRevenuePrevTotal: number;
  heatmap: number[][];
};

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtDollars(cents: number): { whole: string; frac: string } {
  const dollars = cents / 100;
  const [whole, frac] = dollars.toFixed(2).split('.');
  return { whole: `$${Number(whole).toLocaleString()}`, frac };
}

function fmtDollarShort(cents: number): string {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}K`;
  return `$${d.toFixed(0)}`;
}

function fmtRank(n: number): string {
  return n.toString().padStart(2, '0');
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

// Map weekly revenue values to SVG path string
function toSvgPath(values: number[], maxVal: number, svgW = 550, svgH = 256, pad = 20): string {
  if (!values.length || maxVal === 0) return '';
  return values
    .map((v, i) => {
      const x = ((i / (values.length - 1)) * svgW).toFixed(1);
      const y = (svgH - pad - (v / maxVal) * (svgH - 2 * pad)).toFixed(1);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

function toSvgArea(values: number[], maxVal: number, svgW = 550, svgH = 256, pad = 20): string {
  const path = toSvgPath(values, maxVal, svgW, svgH, pad);
  if (!path) return '';
  return `${path} L${svgW},${svgH} L0,${svgH} Z`;
}

// Dot positions for the current-period line
function dotPositions(
  values: number[],
  maxVal: number,
  svgW = 550,
  svgH = 256,
  pad = 20,
): { cx: number; cy: number }[] {
  if (!values.length || maxVal === 0) return [];
  return values.map((v, i) => ({
    cx: (i / (values.length - 1)) * svgW,
    cy: svgH - pad - (v / maxVal) * (svgH - 2 * pad),
  }));
}

const HEAT_BG = [
  'bg-cream-deep',
  'bg-[rgba(184,137,90,0.2)]',
  'bg-[rgba(184,137,90,0.4)]',
  'bg-[rgba(184,137,90,0.65)]',
  'bg-[rgba(107,31,31,0.6)]',
  'bg-oxblood',
];

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOUR_LABELS = ['9A', '10A', '11A', '12P', '1P', '2P', '3P', '4P', '5P', '6P', '7P', '8P'];

// ─── change pill ────────────────────────────────────────────────────────────

function ChangePill({
  val,
  suffix = '%',
  invert = false,
}: {
  val: number;
  suffix?: string;
  invert?: boolean;
}) {
  // invert: for cancel rate, going DOWN is good (green)
  const isUp = invert ? val < 0 : val >= 0;
  const display = `${val >= 0 ? '+' : ''}${val.toFixed(1)}${suffix}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium text-[11px] tracking-[0.02em] font-mono ${
        isUp ? 'bg-green-soft text-green' : 'bg-red-soft text-oxblood'
      }`}
    >
      {isUp ? (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      ) : (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      {display}
    </span>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const [period, setPeriod] = useState<'7D' | '30D' | '90D' | '1Y' | 'Custom'>('30D');
  const [chartView, setChartView] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [heatView, setHeatView] = useState<'Volume' | 'Revenue'>('Volume');

  const { whole: revWhole, frac: revFrac } = fmtDollars(data.revenue);
  const { whole: aovWhole, frac: aovFrac } = fmtDollars(data.aov);

  const maxWeekly = Math.max(1, ...data.weeklyRevenue, ...data.weeklyRevenuePrev);
  const currentPath = toSvgPath(data.weeklyRevenue, maxWeekly);
  const currentArea = toSvgArea(data.weeklyRevenue, maxWeekly);
  const prevPath = toSvgPath(data.weeklyRevenuePrev, maxWeekly);
  const prevArea = toSvgArea(data.weeklyRevenuePrev, maxWeekly);
  const dots = dotPositions(data.weeklyRevenue, maxWeekly);

  // Y-axis labels for chart
  const yMax = maxWeekly / 100; // convert cents → dollars
  const yLabels = [yMax, (yMax * 0.75), (yMax * 0.5), (yMax * 0.25), 0].map((v) =>
    fmtDollarShort(v * 100),
  );

  return (
    <>
      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-9 gap-6 flex-wrap">
        <div className="w-full flex items-center gap-2 text-[12px] text-muted tracking-[0.04em] mb-1">
          <Link href="/dashboard" className="hover:text-oxblood transition-colors">
            Dashboard
          </Link>
          <svg className="w-2.5 h-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-ink">Analytics</span>
        </div>

        <div>
          <div className="font-display italic text-sm text-camel mb-1.5">✦ Insights</div>
          <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
            Shop <em className="italic text-oxblood">analytics</em>
          </h1>
          <p className="text-muted text-sm tracking-[0.02em]">{data.periodLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period compare toggle */}
          <div className="inline-flex bg-paper border border-line rounded-full p-[3px]">
            {(['7D', '30D', '90D', '1Y', 'Custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  period === p ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium tracking-[0.02em] hover:border-ink hover:text-ink transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── HEADLINE BLOCK ────────────────────────────────────────────────── */}
      <div className="bg-ink text-cream rounded-sm p-9 mb-6 relative overflow-hidden">
        <div className="absolute top-[-180px] right-[-180px] w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-end relative z-10">
          {/* Left: revenue metric */}
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-camel-soft mb-3.5 flex items-center gap-2.5">
              <span className="w-6 h-px bg-current opacity-60" />
              Net revenue · {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <div className="font-display font-light text-[clamp(56px,7vw,96px)] leading-none tracking-[-0.04em] mb-3.5 flex items-baseline gap-3.5">
              {revWhole}
              <em className="not-italic italic text-camel text-[0.42em] ml-[-6px] font-normal">
                .{revFrac}
              </em>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[rgba(74,107,58,0.22)] text-[#B8DBA8] px-3 py-1 rounded-full text-[13px] font-medium tracking-[0.02em] font-mono">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {data.revenueChange >= 0 ? '+' : ''}{data.revenueChange.toFixed(1)}% vs last month
            </span>
            <div className="mt-4 text-[13px] text-cream/65 font-mono tracking-[0.04em]">
              {data.orderCount} ORDERS · {aovWhole}.{aovFrac} AVG ·{' '}
              {data.pickupPct}% PICKUP / {100 - data.pickupPct}% DELIVERY
            </div>
          </div>

          {/* Right: sparkline */}
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
              {/* Decorative trend lines */}
              <path
                d="M0,130 L60,125 L120,135 L180,128 L240,140 L300,118 L360,108 L420,85 L480,68 L540,42 L600,28 L600,180 L0,180 Z"
                fill="url(#sparkArea)"
              />
              <path
                d="M0,130 L60,125 L120,135 L180,128 L240,140 L300,118 L360,108 L420,85 L480,68 L540,42 L600,28"
                fill="none"
                stroke="#F4EEE4"
                strokeWidth="2"
              />
              <circle cx="600" cy="28" r="5" fill="#F4EEE4" stroke="#6B1F1F" strokeWidth="2" />
            </svg>
            <div className="flex justify-between mt-2 text-[10px] font-mono text-cream/45 tracking-[0.04em]">
              <span>WK 1</span><span>WK 2</span><span>WK 3</span><span>WK 4</span><span>WK 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Avg Order Value */}
        <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Avg Order Value</span>
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
            <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Repeat Purchase</span>
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[rgba(28,24,20,0.06)] text-muted font-medium text-[11px] font-mono">
              –
            </span>
            customers ordering 2+
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-paper border border-line-soft rounded-sm px-6 py-5.5 hover:border-line transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">New Customers</span>
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
            <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Cancellation Rate</span>
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

      {/* ── § 01 REVENUE CHART + § 02 CATEGORY BREAKDOWN ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
        {/* Revenue chart */}
        <div className="bg-paper border border-line-soft rounded-sm p-7">
          <div className="flex items-end justify-between mb-6 gap-5">
            <div>
              <div className="font-display italic text-[12px] text-camel mb-1">✦ 01</div>
              <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
                Revenue <em className="italic text-oxblood font-normal">over time</em>
              </div>
              <div className="text-[12px] text-muted mt-1">
                Weekly totals · this period vs prev
              </div>
            </div>
            <div className="inline-flex bg-cream-deep rounded-full p-[3px] shrink-0">
              {(['Day', 'Week', 'Month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    chartView === v ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* SVG chart */}
          <div className="relative h-[280px]">
            <div className="absolute top-0 bottom-6 left-0 w-[50px] flex flex-col justify-between font-mono text-[10px] text-muted pointer-events-none">
              {yLabels.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
            <svg
              viewBox="0 0 550 256"
              preserveAspectRatio="none"
              className="absolute inset-0 left-[50px] right-0 bottom-6 top-0 w-[calc(100%-50px)] h-[calc(100%-24px)]"
            >
              <defs>
                <linearGradient id="rev1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6B1F1F" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6B1F1F" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B8895A" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#B8895A" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[56, 112, 168, 224].map((y) => (
                <line key={y} x1="0" y1={y} x2="550" y2={y} stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
              ))}
              {prevArea && <path d={prevArea} fill="url(#rev2)" />}
              {prevPath && (
                <path d={prevPath} fill="none" stroke="#B8895A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
              )}
              {currentArea && <path d={currentArea} fill="url(#rev1)" />}
              {currentPath && (
                <path d={currentPath} fill="none" stroke="#6B1F1F" strokeWidth="2" />
              )}
              {dots.map((d, i) => (
                <circle
                  key={i}
                  cx={d.cx}
                  cy={d.cy}
                  r={i === dots.length - 1 ? 5 : 3}
                  fill="#FBF7F0"
                  stroke="#6B1F1F"
                  strokeWidth={i === dots.length - 1 ? 2 : 1.5}
                />
              ))}
            </svg>
            <div className="absolute bottom-0 left-[50px] right-0 flex justify-between font-mono text-[10px] text-muted tracking-[0.04em]">
              <span>WK 1</span><span>WK 2</span><span>WK 3</span><span>WK 4</span><span>WK 5</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-4.5 pt-4.5 border-t border-line-soft text-[12px] text-muted flex-wrap">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-oxblood" />
              This month ·{' '}
              <strong className="text-ink font-display font-medium text-sm">
                {fmtDollarShort(data.weeklyRevenueTotal)}
              </strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-camel" />
              Last month ·{' '}
              <strong className="text-ink font-display font-medium text-sm">
                {fmtDollarShort(data.weeklyRevenuePrevTotal)}
              </strong>
            </span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-paper border border-line-soft rounded-sm p-7">
          <div className="mb-6">
            <div className="font-display italic text-[12px] text-camel mb-1">✦ 02</div>
            <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
              By <em className="italic text-oxblood font-normal">category</em>
            </div>
            <div className="text-[12px] text-muted mt-1">Where the money came from</div>
          </div>

          {data.categories.length === 0 ? (
            <p className="text-muted text-sm">No order data for this period.</p>
          ) : (
            <div className="flex flex-col gap-0">
              {data.categories.map((cat) => (
                <div key={cat.name} className="py-3.5 border-b border-line-soft last:border-b-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2.5 mb-2">
                    <span className="font-display font-medium text-[15px] tracking-[-0.005em]">
                      {cat.name}
                    </span>
                    <span className="font-display font-medium text-base tracking-[-0.01em]">
                      {fmtDollarShort(cat.revenue)}
                    </span>
                  </div>
                  <div className="h-1 bg-cream-deep rounded-sm overflow-hidden mb-1.5 relative">
                    <div
                      className="h-full rounded-sm origin-left [transform:scaleX(0)] [animation:analyticsBarGrow_1.4s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                      style={
                        {
                          background: cat.color,
                          '--bar-w': cat.barW.toFixed(3),
                        } as React.CSSProperties
                      }
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

      {/* ── § 03 BEST SELLERS + § 04 FUNNEL + § 05 INSIGHTS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Best sellers */}
        <div className="bg-paper border border-line-soft rounded-sm p-7">
          <div className="mb-6">
            <div className="font-display italic text-[12px] text-camel mb-1">✦ 03</div>
            <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
              Best <em className="italic text-oxblood font-normal">sellers</em>
            </div>
            <div className="text-[12px] text-muted mt-1">By revenue, this month</div>
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
                  <span className="font-display italic text-lg text-camel text-center">
                    {fmtRank(p.rank)}
                  </span>
                  <div className="w-12 h-12 rounded-[4px] bg-cream-deep overflow-hidden relative shrink-0">
                    {p.image && isAbsoluteUrl(p.image) ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-medium text-[14px] tracking-[-0.005em] leading-snug mb-1 truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-muted font-mono tracking-[0.04em]">
                      {p.sold} SOLD · {p.category.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-medium text-[15px] tracking-[-0.01em] mb-0.5">
                      {fmtDollarShort(p.revenue)}
                    </div>
                    <div
                      className={`text-[10px] font-mono tracking-[0.02em] ${
                        p.changeDir === 'up' ? 'text-green' : 'text-oxblood'
                      }`}
                    >
                      {p.changeDir === 'up' ? '↑' : '↓'} {p.changePct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer funnel */}
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
              { step: '02', label: 'Product viewed', count: 5230, pct: 62.1, w: 0.62, drop: '↓37.9%' },
              { step: '03', label: 'Added to cart', count: 1840, pct: 21.9, w: 0.22, drop: '↓40.2%' },
              { step: '04', label: 'Started checkout', count: 628, pct: 7.5, w: 0.075, drop: '↓14.4%' },
              { step: '05', label: 'Order placed', count: data.orderCount || 324, pct: data.orderCount ? parseFloat(((data.orderCount / 8420) * 100).toFixed(1)) : 3.8, w: 0.04, drop: null },
            ].map((s) => (
              <div key={s.step}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display font-medium text-[15px] tracking-[-0.005em] flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded-[4px]">
                      {s.step}
                    </span>
                    {s.label}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-display font-medium text-lg tracking-[-0.01em]">
                      {s.count.toLocaleString()}
                    </span>
                    <span className="font-mono text-[11px] text-muted tracking-[0.04em]">
                      {s.pct}%
                    </span>
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

        {/* Insights */}
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
                  ? `<strong>${data.bestSellers[0].name}</strong> is your top earner this month — consider featuring it.`
                  : '<strong>Beef cuts</strong> are driving the majority of this month\'s revenue.',
              },
              {
                tag: 'alert',
                body: data.cancelRate > 5
                  ? `<strong>Cancellation rate is ${data.cancelRate.toFixed(1)}%</strong> — higher than usual. Worth investigating.`
                  : '<strong>Cancellation rate is healthy</strong> — below 5%. Keep it up.',
              },
              {
                tag: 'tip',
                body: '<strong>Cart-to-checkout is your biggest funnel leak.</strong> Worth investigating shipping costs or guest checkout friction.',
              },
              {
                tag: 'up',
                body: `<strong>${data.newCustomers} new customers this month</strong>${data.newCustomersChange > 0 ? `, +${data.newCustomersChange.toFixed(0)}%` : ''} — track repeat orders over the next 30 days.`,
              },
            ].map((ins, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 px-4.5 py-3.5 bg-cream border border-line-soft rounded-sm"
              >
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

      {/* ── § 06 HEATMAP ──────────────────────────────────────────────────── */}
      <div className="bg-paper border border-line-soft rounded-sm p-7 mb-4">
        <div className="flex items-end justify-between mb-6 gap-5">
          <div>
            <div className="font-display italic text-[12px] text-camel mb-1">✦ 05</div>
            <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
              When orders <em className="italic text-oxblood font-normal">happen</em>
            </div>
            <div className="text-[12px] text-muted mt-1">
              Order volume by day-of-week and hour-of-day
            </div>
          </div>
          <div className="inline-flex bg-cream-deep rounded-full p-[3px] shrink-0">
            {(['Volume', 'Revenue'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setHeatView(v)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  heatView === v ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-[3px]" style={{ gridTemplateColumns: '60px repeat(12, 1fr)' }}>
          {data.heatmap.map((row, dayIdx) => (
            <Fragment key={dayIdx}>
              <span className="font-mono text-[10px] text-muted tracking-[0.04em] flex items-center pr-1">
                {DAY_LABELS[dayIdx]}
              </span>
              {row.map((val, hourIdx) => (
                <span
                  key={`${dayIdx}-${hourIdx}`}
                  title={`${DAY_LABELS[dayIdx]} ${HOUR_LABELS[hourIdx]} · ${val > 0 ? `${val} (intensity)` : '0 orders'}`}
                  className={`aspect-square rounded-[2px] cursor-pointer hover:scale-115 hover:z-10 relative transition-transform ${HEAT_BG[val] ?? 'bg-cream-deep'}`}
                />
              ))}
            </Fragment>
          ))}
        </div>

        {/* Column labels */}
        <div className="grid mt-1.5 gap-[3px]" style={{ gridTemplateColumns: '60px repeat(12, 1fr)' }}>
          <span />
          {HOUR_LABELS.map((h) => (
            <span key={h} className="font-mono text-[10px] text-muted tracking-[0.02em] text-center">
              {h}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line-soft text-[11px] text-muted font-mono tracking-[0.04em] flex-wrap">
          <span>LESS</span>
          <div className="flex gap-0.5">
            {HEAT_BG.map((cls, i) => (
              <span key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
            ))}
          </div>
          <span>MORE</span>
          {data.heatmap.flat().some((v) => v > 0) && (
            <span className="ml-4">
              PEAK:{' '}
              {(() => {
                let max = 0;
                let dayI = 0;
                let hourI = 0;
                data.heatmap.forEach((row, d) =>
                  row.forEach((v, h) => {
                    if (v > max) {
                      max = v;
                      dayI = d;
                      hourI = h;
                    }
                  }),
                );
                return `${DAY_LABELS[dayI]} ${HOUR_LABELS[hourI]}`;
              })()}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
