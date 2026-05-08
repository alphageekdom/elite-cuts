type SlotLoad = 'light' | 'medium' | 'heavy';
type SlotStatus = 'open' | 'busy' | 'full';

interface PickupSlot {
  label: string;
  count: number;
  max: number;
  load: SlotLoad;
  status: SlotStatus;
}

const PICKUP_SLOTS: PickupSlot[] = [
  { label: '9–10A', count: 3, max: 10, load: 'light', status: 'open' },
  { label: '10–11A', count: 6, max: 10, load: 'medium', status: 'open' },
  { label: '11A–12P', count: 10, max: 10, load: 'heavy', status: 'full' },
  { label: '12–1P', count: 9, max: 10, load: 'heavy', status: 'busy' },
  { label: '1–2P', count: 5, max: 10, load: 'medium', status: 'open' },
  { label: '2–3P', count: 2, max: 10, load: 'light', status: 'open' },
  { label: '3–4P', count: 1, max: 10, load: 'light', status: 'open' },
  { label: '4–5P', count: 4, max: 10, load: 'medium', status: 'open' },
];

const SLOT_FILL_STYLES: Record<SlotLoad, string> = {
  light: 'bg-green',
  medium: 'bg-camel',
  heavy: 'bg-oxblood',
};

const SLOT_STATUS_STYLES: Record<SlotStatus, string> = {
  open: 'text-green',
  busy: 'text-amber',
  full: 'text-oxblood',
};

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  full: 'Full',
};

function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function SchedulePickupSlots() {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="font-display text-lg font-medium tracking-tight">
          Pickup <em className="italic text-oxblood font-normal">slots</em>
        </span>
        <a href="#" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
          Manage <ChevronRight />
        </a>
      </div>
      <div className="flex flex-col gap-2">
        {PICKUP_SLOTS.map((slot) => (
          <div key={slot.label} className="flex items-center gap-3 px-3.5 py-2.5 bg-cream border border-line-soft rounded">
            <span className="font-mono text-xs font-medium tracking-[0.02em] min-w-[58px]">{slot.label}</span>
            <div className="flex-1">
              <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${SLOT_FILL_STYLES[slot.load]}`}
                  style={{ width: `${(slot.count / slot.max) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-mono text-[11px] text-muted tracking-[0.04em] min-w-[38px] text-right">
              {slot.count}/{slot.max}
            </span>
            <span className={`text-[10px] font-medium tracking-[0.08em] uppercase min-w-[34px] text-right ${SLOT_STATUS_STYLES[slot.status]}`}>
              {SLOT_STATUS_LABEL[slot.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
