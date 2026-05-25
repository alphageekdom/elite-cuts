import { getInitials } from '@/lib/format';
import type { ShiftColor } from '@/lib/shifts/constants';
import { AVATAR_BG, AVATAR_FG } from '@/lib/staff/display';
import ScheduleCardHeader from './ScheduleCardHeader';

type StaffEntry = {
  name: string;
  time: string;
  role: string;
  color: ShiftColor;
};

type Props = {
  todayStaff: StaffEntry[];
};

export default function ScheduleOnTodayCard({ todayStaff }: Props) {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <ScheduleCardHeader title="On" accent="today" linkHref="/dashboard/staff" linkLabel="All staff" />
      {todayStaff.length === 0 ? (
        <p className="text-[13px] text-muted py-4 text-center">No shifts today</p>
      ) : (
        <div className="flex flex-col">
          {todayStaff.map((staff, i) => (
            <div
              key={staff.name}
              className={`flex items-center gap-3 py-3 ${i < todayStaff.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_BG[staff.color] ?? 'bg-cream-deep'} ${AVATAR_FG[staff.color] ?? 'text-ink-soft'}`}>
                {getInitials(staff.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-medium tracking-tight mb-0.5">{staff.name}</div>
                <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{staff.time}</div>
              </div>
              <span className="inline-block min-w-0 truncate px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium bg-ink/6 text-ink-soft">
                {staff.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
