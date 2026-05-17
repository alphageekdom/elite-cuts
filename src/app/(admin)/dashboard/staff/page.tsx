import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import StaffMemberModel, {
  type StaffRoleKey,
  type StaffStatus,
} from '@/models/StaffMember';
import ShiftModel from '@/models/Shift';
import { getMondayOf } from '@/lib/schedule-utils';
import { normalizeWeekStart } from '@/lib/shifts';
import { formatShiftRange, type StaffRow } from '@/lib/staff-display';
import StaffPageClient from '@/components/admin/staff/StaffPageClient';
import type { ShiftColor } from '@/lib/shift-constants';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff · EliteCuts Admin',
};

export default async function AdminStaffPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const weekStart = normalizeWeekStart(getMondayOf(new Date()));
  const dayOfWeek = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6

  const [staff, todaysShifts] = await Promise.all([
    StaffMemberModel.find().sort({ name: 1 }).lean(),
    ShiftModel.find({ weekStart, dayOfWeek }).select('staffName hourIndex').lean(),
  ]);

  // Group shifts by staff name → start hour + end hour.
  const shiftRanges = new Map<string, { min: number; max: number }>();
  for (const s of todaysShifts) {
    const existing = shiftRanges.get(s.staffName);
    if (!existing) {
      shiftRanges.set(s.staffName, { min: s.hourIndex, max: s.hourIndex });
    } else {
      existing.min = Math.min(existing.min, s.hourIndex);
      existing.max = Math.max(existing.max, s.hourIndex);
    }
  }

  const rows: StaffRow[] = staff.map((s) => {
    const range = shiftRanges.get(s.name);
    return {
      id: s._id.toString(),
      name: s.name,
      role: s.role,
      roleKey: (s.roleKey ?? 'other') as StaffRoleKey,
      station: s.station ?? '',
      status: (s.status ?? 'active') as StaffStatus,
      color: s.color as ShiftColor,
      email: s.email ?? '',
      notes: s.notes ?? '',
      workingToday: Boolean(range),
      todayShift: range ? formatShiftRange(range.min, range.max) : null,
    };
  });

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const workingCount = rows.filter((r) => r.workingToday).length;
  const subtitle = rows.length === 0
    ? 'No staff members yet'
    : `${activeCount} active · ${workingCount} working today`;

  return <StaffPageClient rows={rows} headerSubtitle={subtitle} />;
}
