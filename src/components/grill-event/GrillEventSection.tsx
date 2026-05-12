'use client';

import { useMemo, useState } from 'react';

import GrillEventFormDrawer from './GrillEventFormDrawer';
import { useAdminDrawer } from '@/hooks/useAdminDrawer';
import { MONTH_ABBR } from '@/lib/format';
import { formatGrillHour, type SerializedEvent } from '@/lib/event-config';

type Props = {
  upcoming: SerializedEvent[];
  past: SerializedEvent[];
};

type Tab = 'upcoming' | 'past';

function formatLaDate(iso: string): { weekday: string; month: string; day: number; year: number; key: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const month = Number(get('month'));
  const day = Number(get('day'));
  const year = Number(get('year'));
  return {
    weekday: get('weekday').toUpperCase(),
    month: MONTH_ABBR[month - 1] ?? '',
    day,
    year,
    key: year * 10000 + month * 100 + day,
  };
}

function todayLaKey(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return get('year') * 10000 + get('month') * 100 + get('day');
}

function StatusPill({ event, isToday }: { event: SerializedEvent; isToday: boolean }) {
  // Visual override: 'cancelled' with reason "Weather" gets its own label
  const isWeather = event.status === 'cancelled' && event.cancellationReason?.toLowerCase() === 'weather';

  const config: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    live:        { label: 'Live now',  dot: 'bg-green',   bg: 'bg-green-soft',  text: 'text-green' },
    scheduled:   { label: 'Scheduled', dot: 'bg-camel',   bg: 'bg-camel-soft',  text: 'text-ink' },
    cancelled:   { label: 'Cancelled', dot: 'bg-oxblood', bg: 'bg-oxblood/10',  text: 'text-oxblood' },
    completed:   { label: 'Completed', dot: 'bg-muted',   bg: 'bg-[rgba(28,24,20,0.06)]', text: 'text-muted' },
    weather:     { label: 'Weather cancelled', dot: 'bg-oxblood', bg: 'bg-oxblood/10', text: 'text-oxblood' },
  };
  const key = isWeather ? 'weather' : event.status;
  // Visually promote scheduled → "Live now" if today
  const final = isToday && event.status === 'scheduled' ? config.live : config[key];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${final.bg} ${final.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${final.dot}`} />
      {final.label}
    </span>
  );
}

export default function GrillEventSection({ upcoming, past }: Props) {
  const [tab, setTab] = useState<Tab>('upcoming');
  const drawer = useAdminDrawer<SerializedEvent | null>();
  const todayKey = todayLaKey();

  const items = tab === 'upcoming' ? upcoming : past;
  const hasUpcoming = upcoming.length > 0;

  // For empty-state context
  const hint = useMemo(() => {
    if (tab !== 'upcoming') return null;
    if (hasUpcoming) return null;
    return 'No events scheduled. Pick a Saturday in June–September to grill outside.';
  }, [tab, hasUpcoming]);

  return (
    <section className="bg-paper border border-line-soft rounded mt-6">
      <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line-soft flex-wrap">
        <div>
          <div className="text-[11px] tracking-widest uppercase text-muted mb-1">Summer</div>
          <h3 className="font-display text-[22px] font-normal tracking-tight">
            Live <em className="italic text-oxblood">grill events</em>
          </h3>
          <p className="mt-1 text-[12px] text-muted max-w-prose">
            Parking-lot grill windows. June through September, 2–5 hour windows between 10 AM and 3 PM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex bg-cream border border-line rounded-full p-0.5 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-full transition-colors ${tab === 'upcoming' ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'}`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setTab('past')}
              className={`px-3.5 py-1.5 rounded-full transition-colors ${tab === 'past' ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'}`}
            >
              History
            </button>
          </div>
          <button
            type="button"
            onClick={() => drawer.open(null)}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.02em] hover:bg-oxblood transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Schedule event
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-display text-[18px] text-ink-soft">
            {tab === 'upcoming' ? 'Nothing on the grill schedule yet.' : 'No past events.'}
          </p>
          {hint && <p className="mt-2 text-[12px] text-muted">{hint}</p>}
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.map((event) => {
            const fd = formatLaDate(event.date);
            const isToday = fd.key === todayKey && (event.status === 'scheduled' || event.status === 'live');
            return (
              <li
                key={event._id}
                className={`grid grid-cols-[88px_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-cream/40 ${
                  isToday ? 'bg-oxblood/4' : ''
                }`}
              >
                <div>
                  <div className="font-mono text-[10px] tracking-[0.18em] text-muted">{fd.weekday}</div>
                  <div className={`font-display text-[24px] leading-none ${isToday ? 'text-oxblood' : 'text-ink'}`}>
                    {fd.day}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.04em] text-muted mt-0.5">
                    {fd.month} {fd.year}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-[16px] text-ink">
                      {formatGrillHour(event.startHour)} – {formatGrillHour(event.endHour)}
                    </span>
                    <StatusPill event={event} isToday={isToday} />
                  </div>
                  <p className="mt-1 text-[12px] text-muted truncate">{event.message}</p>
                  {event.cancellationReason && (
                    <p className="mt-0.5 text-[11px] text-oxblood/80">Reason: {event.cancellationReason}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => drawer.open(event)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-line text-ink-soft text-[12px] font-medium hover:border-ink hover:text-ink transition-colors"
                >
                  {event.status === 'cancelled' || event.status === 'completed' ? 'View' : 'Edit'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {drawer.isOpen && (
        <GrillEventFormDrawer event={drawer.item ?? null} onClose={drawer.close} />
      )}
    </section>
  );
}
