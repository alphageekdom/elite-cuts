'use client';
import { Fragment, useState } from 'react';
import { HEAT_BG, DAY_LABELS, HOUR_LABELS } from './analytics-utils';

export default function AnalyticsHeatmap({
  heatmap,
  heatmapRevenue,
}: {
  heatmap: number[][];
  heatmapRevenue: number[][];
}) {
  const [heatView, setHeatView] = useState<'Volume' | 'Revenue'>('Volume');
  const activeHeatmap = heatView === 'Revenue' ? heatmapRevenue : heatmap;

  return (
    <div className='bg-paper border-line-soft mb-4 rounded-sm border p-7'>
      <div className='mb-6 flex items-end justify-between gap-5'>
        <div>
          <div className='font-display text-camel mb-1 text-[12px] italic'>
            ✦ 04
          </div>
          <div className='font-display text-[22px] leading-snug font-medium tracking-[-0.015em]'>
            When orders{' '}
            <em className='text-oxblood font-normal italic'>happen</em>
          </div>
          <div className='text-muted mt-1 text-[12px]'>
            {heatView === 'Revenue'
              ? 'Revenue by day and hour'
              : 'Volume by day and hour'}
          </div>
        </div>
        <div className='bg-cream-deep inline-flex shrink-0 rounded-full p-0.75'>
          {(['Volume', 'Revenue'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setHeatView(v)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                heatView === v
                  ? 'bg-ink text-cream'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-[60px_repeat(12,1fr)] gap-0.75'>
        {activeHeatmap.map((row, dayIdx) => (
          <Fragment key={dayIdx}>
            <span className='text-muted flex items-center pr-1 font-mono text-[10px] tracking-[0.04em]'>
              {DAY_LABELS[dayIdx]}
            </span>
            {row.map((val, hourIdx) => (
              <span
                key={`${dayIdx}-${hourIdx}`}
                title={`${DAY_LABELS[dayIdx]} ${HOUR_LABELS[hourIdx]} · ${val > 0 ? `${val} (intensity)` : '0 orders'}`}
                className={`relative aspect-square cursor-pointer rounded-xs transition-transform hover:z-10 hover:scale-115 ${HEAT_BG[val] ?? 'bg-cream-deep'}`}
              />
            ))}
          </Fragment>
        ))}
      </div>

      <div className='mt-1.5 grid grid-cols-[60px_repeat(12,1fr)] gap-0.75'>
        <span />
        {HOUR_LABELS.map((h) => (
          <span
            key={h}
            className='text-muted text-center font-mono text-[10px] tracking-[0.02em]'
          >
            {h}
          </span>
        ))}
      </div>

      <div className='border-line-soft text-muted mt-4 flex flex-wrap items-center gap-2 border-t pt-4 font-mono text-[11px] tracking-[0.04em]'>
        <span>LESS</span>
        <div className='flex gap-0.5'>
          {HEAT_BG.map((cls, i) => (
            <span key={i} className={`h-3 w-3 rounded-xs ${cls}`} />
          ))}
        </div>
        <span>MORE</span>
        {activeHeatmap.flat().some((v) => v > 0) && (
          <span className='ml-4'>
            PEAK:{' '}
            {(() => {
              let max = 0;
              let dayI = 0;
              let hourI = 0;
              activeHeatmap.forEach((row, d) =>
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
  );
}
