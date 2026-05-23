import type { ShopHoursDay } from '@/models/ShopHours';
import { DAY_NAMES } from '@/lib/shopHoursFormat';
import { toMondayIndex } from '@/lib/admin/schedule';
import ScheduleCardHeader from './ScheduleCardHeader';

type Props = { hours: ShopHoursDay[] };

export default function ScheduleShopHours({ hours }: Props) {
  const todayDow = toMondayIndex(new Date().getDay());

  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <ScheduleCardHeader title="Shop" accent="hours" linkHref="/dashboard/settings" linkLabel="Settings" />
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
