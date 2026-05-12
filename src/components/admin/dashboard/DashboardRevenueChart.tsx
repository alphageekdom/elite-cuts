'use client';

import { useState } from 'react';

const TABS = ['7D', '30D', '90D', '1Y'] as const;
type Tab = (typeof TABS)[number];

type Props = {
  weeklyRevenue: { current: number[]; prev: number[] };
};

// Convert 5 weekly revenue values into a smooth SVG polyline path within
// a 600×240 viewBox. Y=0 is top (high revenue), Y=220 is bottom (zero).
function buildPath(values: number[], maxVal: number): string {
  if (maxVal === 0) {
    return `M0,220 L150,220 L300,220 L450,220 L600,220`;
  }
  const xs = [0, 150, 300, 450, 600];
  const pts = values.map((v, i) => ({
    x: xs[i],
    y: 220 - Math.round((v / maxVal) * 200),
  }));
  // Cubic bezier smooth curve through the points
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
    d += ` C${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function fmtMoney(n: number) {
  return n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export default function DashboardRevenueChart({ weeklyRevenue }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('30D');

  const { current, prev } = weeklyRevenue;
  const maxVal = Math.max(...current, ...prev, 1);

  const currentPath = buildPath(current, maxVal);
  const prevPath = buildPath(prev, maxVal);
  const currentTotal = current.reduce((a, b) => a + b, 0);
  const prevTotal = prev.reduce((a, b) => a + b, 0);

  // Area fill path = line path + close to bottom
  const currentArea = `${currentPath} L600,240 L0,240 Z`;
  const prevArea = `${prevPath} L600,240 L0,240 Z`;

  // End point of current line
  const lastPt = (() => {
    const xs = [0, 150, 300, 450, 600];
    const endY = maxVal > 0 ? 220 - Math.round((current[4] / maxVal) * 200) : 220;
    return { x: xs[4], y: endY };
  })();

  return (
    <div className="bg-paper rounded-sm px-7.5 py-7 border border-line-soft">
      <div className="flex items-end justify-between mb-7 gap-5">
        <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
          Revenue{' '}
          <em className="italic text-oxblood font-normal">over time</em>
        </div>
        <div className="inline-flex bg-cream-deep rounded-full p-0.75">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                activeTab === tab ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="h-60 relative">
        <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-oxblood)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-oxblood)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-camel)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--color-camel)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1="0" y1="60"  x2="600" y2="60"  stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
          <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
          <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />

          <path d={prevArea} fill="url(#areaGrad2)" />
          <path d={prevPath} fill="none" stroke="var(--color-camel)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

          <path d={currentArea} fill="url(#areaGrad)" />
          <path d={currentPath} fill="none" stroke="var(--color-oxblood)" strokeWidth="2" />

          <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="var(--color-paper)" stroke="var(--color-oxblood)" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex gap-6 mt-4 pt-4 border-t border-line-soft text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-xs bg-oxblood inline-block" />
          This month · {fmtMoney(currentTotal)}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-xs bg-camel inline-block" />
          Last month · {fmtMoney(prevTotal)}
        </span>
      </div>
    </div>
  );
}
