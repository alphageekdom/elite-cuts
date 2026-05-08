type ShiftColor = 'tangelo' | 'marcus' | 'elena' | 'sam' | 'maya' | 'delivery';

interface StaffEntry {
  initials: string;
  name: string;
  time: string;
  role: string;
  isLead?: boolean;
  color: ShiftColor;
}

const AVATAR_STYLES: Record<ShiftColor, string> = {
  tangelo: 'bg-oxblood text-cream',
  marcus: 'bg-ink text-cream',
  elena: 'bg-camel text-ink',
  sam: 'bg-green text-cream',
  maya: 'bg-camel-soft text-ink',
  delivery: 'bg-cream-deep text-ink-soft',
};

const STAFF_TODAY: StaffEntry[] = [
  { initials: 'TD', name: 'Tangelo Doe', time: '8AM – 3PM · 7HR', role: 'Lead', isLead: true, color: 'tangelo' },
  { initials: 'MR', name: 'Marcus Reyes', time: '9AM – 4PM · 7HR', role: 'Butcher', color: 'marcus' },
  { initials: 'SO', name: 'Sam Okafor', time: '11AM – 7PM · 8HR', role: 'Counter', color: 'sam' },
  { initials: 'MP', name: 'Maya Park', time: '12PM – 7PM · 7HR', role: 'Counter', color: 'maya' },
];

function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function ScheduleOnTodayCard() {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="font-display text-lg font-medium tracking-tight">
          On <em className="italic text-oxblood font-normal">today</em>
        </span>
        <a href="/dashboard/schedule" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
          All staff <ChevronRight />
        </a>
      </div>
      <div className="flex flex-col">
        {STAFF_TODAY.map((staff, i) => (
          <div
            key={staff.name}
            className={`flex items-center gap-3 py-3 ${i < STAFF_TODAY.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_STYLES[staff.color]}`}>
              {staff.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-medium tracking-tight mb-0.5">{staff.name}</div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{staff.time}</div>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium ${staff.isLead ? 'bg-red-soft text-oxblood' : 'bg-ink/[6%] text-ink-soft'}`}>
              {staff.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
