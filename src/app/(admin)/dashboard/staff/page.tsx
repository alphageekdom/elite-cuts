import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import StaffMemberModel from '@/models/StaffMember';
import ShiftModel from '@/models/Shift';
import { getMondayOf } from '@/lib/shifts/schedule';
import { normalizeWeekStart } from '@/lib/shifts/queries';
import { buildStaffRows } from '@/lib/admin/staff';
import StaffPageClient from '@/components/admin/staff/StaffPageClient';

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

  const rows = buildStaffRows(staff, todaysShifts);

  const subtitle = rows.length === 0
    ? 'No staff members yet'
    : `${rows.length} staff member${rows.length === 1 ? '' : 's'}`;

  return <StaffPageClient rows={rows} headerSubtitle={subtitle} />;
}
