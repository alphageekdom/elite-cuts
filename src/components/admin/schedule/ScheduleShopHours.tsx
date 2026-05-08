interface ShopHour {
  day: string;
  hours: string;
  closed?: boolean;
  isToday?: boolean;
}

const SHOP_HOURS: ShopHour[] = [
  { day: 'Monday', hours: 'CLOSED', closed: true },
  { day: 'Tuesday', hours: '9AM – 7PM' },
  { day: 'Wednesday', hours: '9AM – 7PM', isToday: true },
  { day: 'Thursday', hours: '9AM – 7PM' },
  { day: 'Friday', hours: '9AM – 7PM' },
  { day: 'Saturday', hours: '9AM – 7PM' },
  { day: 'Sunday', hours: '10AM – 4PM' },
];

function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function ScheduleShopHours() {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="font-display text-lg font-medium tracking-tight">
          Shop <em className="italic text-oxblood font-normal">hours</em>
        </span>
        <a href="#" className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors">
          Edit <ChevronRight />
        </a>
      </div>
      <div>
        {SHOP_HOURS.map((h, i) => (
          <div
            key={h.day}
            className={`flex justify-between items-baseline py-2 text-[13px] ${
              h.isToday ? 'bg-oxblood/[4%] -mx-3.5 px-3.5 rounded' : ''
            } ${i < SHOP_HOURS.length - 1 ? 'border-b border-line-soft' : ''}`}
          >
            <span className={h.isToday ? 'text-ink font-medium' : 'text-ink-soft'}>{h.day}</span>
            <span className={`font-mono text-xs font-medium tracking-[0.02em] ${h.closed ? 'text-oxblood' : 'text-ink'}`}>
              {h.hours}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
