'use client';
import { Fragment, useState } from 'react';
import { HEAT_BG, DAY_LABELS, HOUR_LABELS } from './analytics-utils';

export default function AnalyticsHeatmap({ heatmap, heatmapRevenue }: { heatmap: number[][]; heatmapRevenue: number[][] }) {
  const [heatView, setHeatView] = useState<'Volume' | 'Revenue'>('Volume');
  const activeHeatmap = heatView === 'Revenue' ? heatmapRevenue : heatmap;

  return (
    <div className="bg-paper border border-line-soft rounded-sm p-7 mb-4">
      <div className="flex items-end justify-between mb-6 gap-5">
        <div>
          <div className="font-display italic text-[12px] text-camel mb-1">✦ 04</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            When orders <em className="italic text-oxblood font-normal">happen</em>
          </div>
          <div className="text-[12px] text-muted mt-1">{heatView === 'Revenue' ? 'Revenue by day and hour' : 'Volume by day and hour'}</div>
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
        {activeHeatmap.map((row, dayIdx) => (
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

      <div className="grid mt-1.5 gap-[3px]" style={{ gridTemplateColumns: '60px repeat(12, 1fr)' }}>
        <span />
        {HOUR_LABELS.map((h) => (
          <span key={h} className="font-mono text-[10px] text-muted tracking-[0.02em] text-center">{h}</span>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line-soft text-[11px] text-muted font-mono tracking-[0.04em] flex-wrap">
        <span>LESS</span>
        <div className="flex gap-0.5">
          {HEAT_BG.map((cls, i) => (
            <span key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
          ))}
        </div>
        <span>MORE</span>
        {activeHeatmap.flat().some((v) => v > 0) && (
          <span className="ml-4">
            PEAK:{' '}
            {(() => {
              let max = 0; let dayI = 0; let hourI = 0;
              activeHeatmap.forEach((row, d) => row.forEach((v, h) => { if (v > max) { max = v; dayI = d; hourI = h; } }));
              return `${DAY_LABELS[dayI]} ${HOUR_LABELS[hourI]}`;
            })()}
          </span>
        )}
      </div>
    </div>
  );
}
