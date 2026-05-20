import type { ShopHoursDay } from '@/models/ShopHours';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Props = { hours: ShopHoursDay[] };

function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function ScheduleShopHours({ hours }: Props) {
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun

  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="font-display text-lg font-medium tracking-tight">
          Shop <em className="italic text-oxblood font-normal">hours</em>
        </span>
        <a
          href="/dashboard/settings"
          className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors"
        >
          Edit <ChevronRight />
        </a>
      </div>
      <div>
        {sorted.map((h, i) => {
          const isToday = h.dayOfWeek === todayDow;
          const label = DAY_NAMES[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`;
          const hoursStr = h.isClosed ? 'CLOSED' : `${h.opensAt} – ${h.closesAt}`;
          return (
            <div
              key={h.dayOfWeek}
              className={`flex justify-between items-baseline py-2 text-[13px] ${
                isToday ? 'bg-oxblood/4 -mx-3.5 px-3.5 rounded' : ''
              } ${i < sorted.length - 1 ? 'border-b border-line-soft' : ''}`}
            >
              <span className={isToday ? 'text-ink font-medium' : 'text-ink-soft'}>{label}</span>
              <span className={`font-mono text-xs font-medium tracking-[0.02em] ${h.isClosed ? 'text-oxblood' : 'text-ink'}`}>
                {hoursStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
