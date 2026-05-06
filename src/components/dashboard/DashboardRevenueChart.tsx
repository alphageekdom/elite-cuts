'use client';

import { useState } from 'react';

const TABS = ['7D', '30D', '90D', '1Y'] as const;
type Tab = (typeof TABS)[number];

export default function DashboardRevenueChart() {
  const [activeTab, setActiveTab] = useState<Tab>('30D');

  return (
    <div className="bg-paper rounded-[4px] px-[30px] py-7 border border-line-soft">
      {/* Card head */}
      <div className="flex items-end justify-between mb-7 gap-5">
        <div>
          <div className="font-display italic text-[12px] text-camel mb-1">✦ 01</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            Revenue{' '}
            <em className="not-italic italic text-oxblood font-normal">over time</em>
          </div>
        </div>

        <div className="inline-flex bg-cream-deep rounded-full p-[3px]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-ink text-cream'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-60 relative">
        <svg
          className="w-full h-full"
          viewBox="0 0 600 240"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B1F1F" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6B1F1F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B8895A" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#B8895A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="60" x2="600" y2="60" stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
          <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
          <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />

          {/* Last month (camel, dashed) */}
          <path
            d="M0,160 C 60,150 100,170 150,155 C 200,140 240,160 290,145 C 340,130 380,150 430,135 C 480,120 520,140 600,125 L 600,240 L 0,240 Z"
            fill="url(#areaGrad2)"
          />
          <path
            d="M0,160 C 60,150 100,170 150,155 C 200,140 240,160 290,145 C 340,130 380,150 430,135 C 480,120 520,140 600,125"
            fill="none"
            stroke="#B8895A"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* This month (oxblood) */}
          <path
            d="M0,180 C 60,160 100,150 150,130 C 200,115 240,140 290,110 C 340,90 380,120 430,95 C 480,75 520,90 600,55 L 600,240 L 0,240 Z"
            fill="url(#areaGrad)"
          />
          <path
            d="M0,180 C 60,160 100,150 150,130 C 200,115 240,140 290,110 C 340,90 380,120 430,95 C 480,75 520,90 600,55"
            fill="none"
            stroke="#6B1F1F"
            strokeWidth="2"
          />

          {/* End point */}
          <circle cx="600" cy="55" r="5" fill="#FBF7F0" stroke="#6B1F1F" strokeWidth="2" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-line-soft text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-oxblood inline-block" />
          This month · $48,230
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-camel inline-block" />
          Last month · $42,890
        </span>
      </div>
    </div>
  );
}
