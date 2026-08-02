import ScheduleCardHeader from './ScheduleCardHeader';

type SlotLoad = 'light' | 'medium' | 'heavy';
type SlotStatus = 'open' | 'busy' | 'full';

export type PickupSlotRow = {
  label: string;
  count: number;
  max: number;
};

const SLOT_FILL_STYLES: Record<SlotLoad, string> = {
  light: 'bg-green',
  medium: 'bg-camel',
  heavy: 'bg-oxblood',
};

const SLOT_STATUS_STYLES: Record<SlotStatus, string> = {
  open: 'text-green',
  busy: 'text-amber-deep',
  full: 'text-oxblood',
};

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  full: 'Full',
};

function classify(count: number, max: number): { load: SlotLoad; status: SlotStatus } {
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 1) return { load: 'heavy', status: 'full' };
  if (ratio >= 0.7) return { load: 'heavy', status: 'busy' };
  if (ratio >= 0.4) return { load: 'medium', status: 'open' };
  return { load: 'light', status: 'open' };
}

type Props = { slots: PickupSlotRow[] };

export default function SchedulePickupSlots({ slots }: Props) {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <ScheduleCardHeader title="Pickup" accent="slots" linkHref="/dashboard/settings" linkLabel="Manage" />
      <div className="flex flex-col gap-2">
        {slots.map((slot, i) => {
          const { load, status } = classify(slot.count, slot.max);
          return (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 bg-cream border border-line-soft rounded">
              <span className="font-mono text-xs font-medium tracking-[0.02em] min-w-14.5">{slot.label}</span>
              <div className="flex-1">
                <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${SLOT_FILL_STYLES[load]}`}
                    style={{ width: `${Math.min((slot.count / Math.max(slot.max, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-[11px] text-muted tracking-[0.04em] min-w-9.5 text-right">
                {slot.count}/{slot.max}
              </span>
              <span className={`text-[10px] font-medium tracking-[0.08em] uppercase min-w-8.5 text-right ${SLOT_STATUS_STYLES[status]}`}>
                {SLOT_STATUS_LABEL[status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
