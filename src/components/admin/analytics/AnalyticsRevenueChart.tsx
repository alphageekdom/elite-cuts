'use client';
import { useState } from 'react';
import { fmtDollarShort, toSvgPath, toSvgArea, dotPositions } from './analytics-utils';
import type { AnalyticsData } from './AnalyticsClient';

export default function AnalyticsRevenueChart({ data }: { data: AnalyticsData }) {
  const [chartView, setChartView] = useState<'Day' | 'Week' | 'Month'>('Week');

  const maxWeekly = Math.max(1, ...data.weeklyRevenue, ...data.weeklyRevenuePrev);
  const currentPath = toSvgPath(data.weeklyRevenue, maxWeekly);
  const currentArea = toSvgArea(data.weeklyRevenue, maxWeekly);
  const prevPath = toSvgPath(data.weeklyRevenuePrev, maxWeekly);
  const prevArea = toSvgArea(data.weeklyRevenuePrev, maxWeekly);
  const dots = dotPositions(data.weeklyRevenue, maxWeekly);

  const yMax = maxWeekly;
  const yLabels = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0].map((v) =>
    fmtDollarShort(v),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
      {/* Revenue chart */}
      <div className="bg-paper border border-line-soft rounded-sm p-7">
        <div className="flex items-end justify-between mb-6 gap-5">
          <div>
            <div className="font-display italic text-[12px] text-camel mb-1">✦ 01</div>
            <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
              Revenue <em className="italic text-oxblood font-normal">over time</em>
            </div>
            <div className="text-[12px] text-muted mt-1">Weekly totals · this period vs previous</div>
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
            {prevPath && <path d={prevPath} fill="none" stroke="#B8895A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />}
            {currentArea && <path d={currentArea} fill="url(#rev1)" />}
            {currentPath && <path d={currentPath} fill="none" stroke="#6B1F1F" strokeWidth="2" />}
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

        <div className="flex gap-6 mt-4.5 pt-4.5 border-t border-line-soft text-[12px] text-muted flex-wrap">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-oxblood" />
            This month · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(data.weeklyRevenueTotal)}</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-camel" />
            Last month · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(data.weeklyRevenuePrevTotal)}</strong>
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
