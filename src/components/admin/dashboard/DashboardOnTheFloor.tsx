import DashboardCardHeader from './DashboardCardHeader';
import type { TodayStaffEntry } from '@/lib/admin/schedule';
import { AVATAR_BG, AVATAR_FG } from '@/lib/staff/display';
import { getInitials } from '@/lib/format';

type Props = {
  staff: TodayStaffEntry[];
  /** Headcount on the roster vs. the whole team, e.g. 4 of 6. */
  rosteredCount: number;
  totalCount: number;
};

// Who is on today, straight off this week's shifts — the same `buildTodayStaff`
// derivation the schedule page's own "On today" card reads from, so the two
// surfaces cannot disagree about who is in.

export default function DashboardOnTheFloor({ staff, rosteredCount, totalCount }: Props) {
  return (
    <section className="rounded-sm border border-line-soft bg-paper px-6 py-6">
      <DashboardCardHeader title="On the floor" href="/dashboard/schedule" linkLabel="Schedule" />

      <p className="mt-2 text-[12.5px] text-muted">
        {totalCount === 0
          ? 'No staff on the roster yet'
          : `${rosteredCount} of ${totalCount} on the roster today`}
      </p>

      {staff.length === 0 ? (
        <p className="mt-5 text-[13px] leading-relaxed text-ink-soft">
          Nobody is rostered today. Add a shift on the schedule to fill the floor.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {staff.map((person) => (
            <li key={person.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[12px] font-semibold ${
                  AVATAR_BG[person.color] ?? 'bg-cream-deep'
                } ${AVATAR_FG[person.color] ?? 'text-ink-soft'}`}
              >
                {getInitials(person.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{person.name}</span>
                {person.role && (
                  <span className="block truncate text-[12px] text-muted">{person.role}</span>
                )}
              </span>
              <span className="shrink-0 rounded-full bg-cream-deep px-2.5 py-1 font-mono text-[10.5px] whitespace-nowrap text-muted-deep">
                {person.time}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
