'use client';
import { useState } from 'react';
import { MONTH_ABBR } from '@/lib/format';

type AgingPhase = 'early' | 'mid' | 'ready' | 'past';

export type AgingCutRow = {
  _id: string;
  cut: string;
  targetDays: number;
  rack: string;
  weightLb: number;
  startedAt: string;
  isActive: boolean;
};

function getAgingPhase(day: number, target: number): AgingPhase {
  if (day > target) return 'past';
  const ratio = day / target;
  if (ratio >= 0.8) return 'ready';
  if (ratio >= 0.5) return 'mid';
  return 'early';
}

const AGING_PILL_STYLE: Record<AgingPhase, string> = {
  early: 'bg-amber-soft text-amber',
  mid: 'bg-[rgba(184,137,90,0.25)] text-camel',
  ready: 'bg-green-soft text-green',
  past: 'bg-red-soft text-oxblood',
};

const AGING_BAR_COLOR: Record<AgingPhase, string> = {
  early: 'bg-camel-soft',
  mid: 'bg-camel',
  ready: 'bg-green',
  past: 'bg-oxblood',
};

function fmtDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;
}

type Props = { cuts: AgingCutRow[] };

export default function InventoryAgingRoom({ cuts }: Props) {
  const [agingTab, setAgingTab] = useState<'active' | 'history'>('active');
  const [today] = useState(() => Date.now());
  const rows = cuts
    .filter((c) => (agingTab === 'active' ? c.isActive : !c.isActive))
    .map((c) => {
      const day = Math.floor((today - new Date(c.startedAt).getTime()) / 86400000);
      const readyDate = new Date(new Date(c.startedAt).getTime() + c.targetDays * 86400000);
      return { ...c, day, readyLabel: fmtDate(readyDate), startedLabel: fmtDate(c.startedAt) };
    });

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <div className="flex items-end justify-between mb-6 gap-5">
        <div>
          <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
            Aging <em className="italic text-oxblood font-normal">room</em>
          </div>
          <div className="text-[12px] text-muted mt-1">
            28-day climate-controlled cabinet · {cuts.filter((c) => c.isActive).length} cuts active
          </div>
        </div>
        <div className="inline-flex bg-cream-deep rounded-full p-0.5 shrink-0">
          {(['active', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAgingTab(tab)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-colors ${agingTab === tab ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'}`}
            >
              {tab === 'active' ? 'Active' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-[13px] py-8 text-center">No {agingTab} cuts in the aging room.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rows.map((cut) => {
            const phase = getAgingPhase(cut.day, cut.targetDays);
            const barPct = Math.min((cut.day / cut.targetDays) * 100, 100);
            return (
              <div key={cut._id} className="relative bg-cream border border-line-soft rounded p-4 overflow-hidden hover:border-line hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="font-display text-[15px] font-medium tracking-tight leading-snug">{cut.cut}</div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full tracking-[0.04em] shrink-0 ml-1 ${AGING_PILL_STYLE[phase]}`}>
                    DAY {cut.day}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">
                  <strong className="text-ink font-medium">{cut.rack || '—'}</strong>
                  <br />
                  {cut.weightLb} LB · STARTED {cut.startedLabel}
                  <br />
                  {cut.day > cut.targetDays ? (
                    <strong className="text-oxblood font-medium">{cut.day - cut.targetDays} DAYS OVER</strong>
                  ) : (
                    <>READY {cut.readyLabel}</>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cream-deep">
                  <div className={`h-full transition-all duration-700 ${AGING_BAR_COLOR[phase]}`} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
