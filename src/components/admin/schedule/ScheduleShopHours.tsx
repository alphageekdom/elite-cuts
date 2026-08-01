import type { ShopHoursDay } from '@/models/ShopHours';
import { DAY_NAMES } from '@/lib/shop-settings/hours-format';
import ScheduleCardHeader from './ScheduleCardHeader';

// `todayMondayIndex` is derived from the SHOP's calendar day upstream and
// threaded in, rather than read here off `new Date()`. Reading the runtime
// clock made this the one card on the page that could disagree with its three
// siblings — on a UTC deploy serving a Pacific shop it highlighted tomorrow's
// row from 5pm local, and then flipped back on hydration.
type Props = { hours: ShopHoursDay[]; todayMondayIndex: number };

export default function ScheduleShopHours({ hours, todayMondayIndex }: Props) {
  const todayDow = todayMondayIndex;

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
