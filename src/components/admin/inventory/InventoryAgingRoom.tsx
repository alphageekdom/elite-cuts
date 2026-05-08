'use client';
import { useState } from 'react';

type AgingPhase = 'early' | 'mid' | 'ready' | 'past';

const AGING_CUTS = [
  { id: 'a1', cut: 'Ribeye #A', day: 26, target: 28, rack: 'Rack 1, Shelf 2', weight: '8.4', started: 'May 8', ready: 'Jun 5' },
  { id: 'a2', cut: 'Ribeye #B', day: 24, target: 28, rack: 'Rack 1, Shelf 3', weight: '9.1', started: 'May 10', ready: 'Jun 7' },
  { id: 'a3', cut: 'Strip Loin', day: 18, target: 28, rack: 'Rack 2, Shelf 1', weight: '12.3', started: 'May 16', ready: 'Jun 13' },
  { id: 'a4', cut: 'Tomahawk', day: 14, target: 28, rack: 'Rack 2, Shelf 2', weight: '6.8', started: 'May 20', ready: 'Jun 17' },
  { id: 'a5', cut: 'Bone-in Ribeye', day: 8, target: 28, rack: 'Rack 3, Shelf 1', weight: '7.2', started: 'May 26', ready: 'Jun 23' },
  { id: 'a6', cut: 'Porterhouse', day: 5, target: 28, rack: 'Rack 3, Shelf 2', weight: '10.5', started: 'May 29', ready: 'Jun 26' },
  { id: 'a7', cut: 'Côte de Boeuf', day: 3, target: 28, rack: 'Rack 4, Shelf 1', weight: '5.6', started: 'May 31', ready: 'Jun 28' },
  { id: 'a8', cut: 'NY Strip Primal', day: 30, target: 28, rack: 'Rack 1, Shelf 1', weight: '11.0', started: 'May 6', ready: 'Jun 3', pastDue: true },
];

function getAgingPhase(day: number, target: number, pastDue?: boolean): AgingPhase {
  if (pastDue || day > target) return 'past';
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

export default function InventoryAgingRoom() {
  const [agingTab, setAgingTab] = useState<'active' | 'history'>('active');

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <div className="flex items-end justify-between mb-6 gap-5">
        <div>
          <div className="font-display italic text-[12px] text-camel mb-1">§ 01</div>
          <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
            Aging <em className="italic text-oxblood font-normal">room</em>
          </div>
          <div className="text-[12px] text-muted mt-1">28-day climate-controlled cabinet · 8 cuts active</div>
        </div>
        <div className="inline-flex bg-cream-deep rounded-full p-0.5 shrink-0">
          {(['active', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAgingTab(tab)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-colors ${
                agingTab === tab ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab === 'active' ? 'Active' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {AGING_CUTS.map((cut) => {
          const phase = getAgingPhase(cut.day, cut.target, cut.pastDue);
          const barPct = Math.min((cut.day / cut.target) * 100, 100);
          return (
            <div
              key={cut.id}
              className="relative bg-cream border border-line-soft rounded p-4 overflow-hidden hover:border-line hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="font-display text-[15px] font-medium tracking-tight leading-snug">{cut.cut}</div>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full tracking-[0.04em] shrink-0 ml-1 ${AGING_PILL_STYLE[phase]}`}
                >
                  DAY {cut.day}
                </span>
              </div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">
                <strong className="text-ink font-medium">{cut.rack}</strong>
                <br />
                {cut.weight} LB · STARTED {cut.started}
                <br />
                {cut.pastDue ? (
                  <strong className="text-oxblood font-medium">{cut.day - cut.target} DAYS OVER</strong>
                ) : (
                  <>READY {cut.ready}</>
                )}
              </div>
              {/* Bottom progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cream-deep">
                <div
                  className={`h-full transition-all duration-700 ${AGING_BAR_COLOR[phase]}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
