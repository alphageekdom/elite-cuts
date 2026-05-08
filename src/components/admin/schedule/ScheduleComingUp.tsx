type EventKind = 'delivery' | 'special' | 'holiday';

interface ScheduleEvent {
  kind: EventKind;
  title: string;
  meta: string;
}

const EVENTS: ScheduleEvent[] = [
  { kind: 'delivery', title: 'Hartwell Ranch delivery', meta: 'TODAY · 1 PM · ~120 LB BEEF' },
  { kind: 'delivery', title: 'Wildwood Farm delivery', meta: 'FRI MAY 2 · 11 AM · ~60 LB PORK' },
  { kind: 'special', title: 'Wagyu allocation drop', meta: 'SAT MAY 3 · A5 STRIPLOIN · MEMBERS FIRST' },
  { kind: 'holiday', title: 'Cinco de Mayo – extended hours', meta: 'MON MAY 5 · OPEN 9AM – 8PM (SPECIAL)' },
];

function DeliveryIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function ScheduleComingUp() {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="mb-4">
        <span className="font-display text-lg font-medium tracking-tight">
          Coming <em className="italic text-oxblood font-normal">up</em>
        </span>
      </div>
      <div className="flex flex-col">
        {EVENTS.map((event, i) => (
          <div
            key={event.title}
            className={`flex items-start gap-3 py-3 ${i < EVENTS.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mt-px ${
                event.kind === 'delivery'
                  ? 'bg-cream-deep text-ink-soft'
                  : event.kind === 'special'
                  ? 'bg-amber-soft text-amber'
                  : 'bg-green-soft text-green'
              }`}
            >
              {event.kind === 'delivery' && <DeliveryIcon />}
              {event.kind === 'special' && <StarIcon />}
              {event.kind === 'holiday' && <CalendarIcon />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-medium tracking-tight leading-tight mb-0.5">
                {event.title}
              </div>
              <div className="font-mono text-[10px] text-muted tracking-[0.04em] leading-relaxed">
                {event.meta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
