import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import StaffMemberModel from '@/models/StaffMember';
import ShiftModel from '@/models/Shift';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getInitials } from '@/lib/format';
import { getMondayOf } from '@/lib/schedule-utils';
import { normalizeWeekStart } from '@/lib/shifts';
import type { ShiftColor } from '@/lib/shift-constants';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff · EliteCuts Admin',
};

const AVATAR_BG: Record<ShiftColor, string> = {
  tangelo: 'bg-oxblood',
  marcus: 'bg-ink',
  elena: 'bg-camel',
  sam: 'bg-green',
  maya: 'bg-camel-soft',
  delivery: 'bg-cream-deep',
};

const AVATAR_FG: Record<ShiftColor, string> = {
  tangelo: 'text-cream',
  marcus: 'text-cream',
  elena: 'text-ink',
  sam: 'text-cream',
  maya: 'text-ink',
  delivery: 'text-ink-soft',
};

export default async function AdminStaffPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const weekStart = normalizeWeekStart(getMondayOf(new Date()));
  const today = new Date();
  const dayOfWeek = ((today.getDay() + 6) % 7); // Mon=0 … Sun=6

  const [staff, todaysShifts] = await Promise.all([
    StaffMemberModel.find({ isActive: true }).sort({ name: 1 }).lean(),
    ShiftModel.find({ weekStart, dayOfWeek }).select('staffName').lean(),
  ]);

  const workingTodayNames = new Set(todaysShifts.map((s) => s.staffName));
  const workingCount = staff.filter((s) => workingTodayNames.has(s.name)).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="✦ Roster"
        breadcrumb="Staff"
        title="Shop"
        titleAccent="staff"
        subtitle={
          staff.length === 0
            ? 'No active staff members yet'
            : `${staff.length} active · ${workingCount} working today`
        }
      />

      {staff.length === 0 ? (
        <div className="bg-paper border border-line-soft rounded-sm p-12 text-center">
          <p className="text-muted text-sm">
            No staff members yet. Run the seed or POST to /api/staff to add some.
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-cream border-b border-line-soft">
              <tr>
                <th className="text-left px-6 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
                  Name
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
                  Role
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
                  Color
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
                  Today
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => {
                const isWorking = workingTodayNames.has(s.name);
                const color = s.color as ShiftColor;
                return (
                  <tr
                    key={s._id.toString()}
                    className={i < staff.length - 1 ? 'border-b border-line-soft' : ''}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-xs shrink-0 ${AVATAR_BG[color]} ${AVATAR_FG[color]}`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="font-display text-sm font-medium tracking-tight">
                          {s.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {s.role ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium bg-ink/6 text-ink-soft">
                          {s.role}
                        </span>
                      ) : (
                        <span className="text-muted text-[13px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] text-ink-soft uppercase tracking-[0.06em]">
                        <span className={`w-3 h-3 rounded-full ${AVATAR_BG[color]}`} />
                        {color}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isWorking ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-green/15 text-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-green" />
                          Working today
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
                          Off
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
