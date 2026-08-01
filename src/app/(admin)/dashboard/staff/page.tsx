import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import StaffMemberModel from '@/models/StaffMember';
import ShiftModel from '@/models/Shift';
import { mondayOfShopDay } from '@/lib/shifts/schedule';
import { normalizeWeekStart } from '@/lib/shifts/queries';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  shopDateKey,
  shopWeekdayIndex,
} from '@/lib/shop-settings/pickup-format';
import { buildStaffRows } from '@/lib/admin/staff';
import StaffPageClient from '@/components/admin/staff/StaffPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff · Admin',
};

export default async function AdminStaffPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  // Both the week and "today" come off the shop's clock, not the server's:
  // on a UTC runtime serving a Pacific shop, every evening after 5pm local
  // this page read tomorrow's weekday — so the "working today" column showed
  // the wrong roster — and on Sunday evenings it jumped a week ahead too.
  const shopSettings = await getShopSettings();
  const now = new Date();
  const weekStart = normalizeWeekStart(
    mondayOfShopDay(shopDateKey(shopSettings.timezone, now)),
  );
  const dayOfWeek = shopWeekdayIndex(shopSettings.timezone, now); // Mon=0 … Sun=6

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
