import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import ShiftModel from '@/models/Shift';
import ShopHoursModel, { DEFAULT_DAYS } from '@/models/ShopHours';
import ShopSettingsModel from '@/models/ShopSettings';
import Order from '@/models/Order';
import DeliveryModel from '@/models/Delivery';
import StaffMemberModel, { type StaffRoleKey } from '@/models/StaffMember';
import ScheduleClient, { type ShiftRow, type StaffUserOption } from '@/components/admin/schedule/ScheduleClient';
import GrillEventSection from '@/components/grill-event/GrillEventSection';
import type { PickupSlotRow } from '@/components/admin/schedule/SchedulePickupSlots';
import { SLOT_LABELS } from '@/components/admin/schedule/SchedulePickupSlots';
import { getMondayOf } from '@/lib/schedule-utils';
import { normalizeWeekStart } from '@/lib/shifts';
import { getPastEvents, getUpcomingEvents } from '@/lib/events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Schedule · EliteCuts Admin',
};

export default async function AdminSchedulePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const weekStart = normalizeWeekStart(getMondayOf(new Date()));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  // Today's date range for pickup slot counts
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [rawShifts, shopHoursDoc, settingsDoc, pickupOrders, deliveryCount, upcomingEvents, pastEvents, rawStaff] = await Promise.all([
    ShiftModel.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean(),
    ShopHoursModel.findOneAndUpdate({}, {}, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean(),
    ShopSettingsModel.findOneAndUpdate({}, {}, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean(),
    Order.find({
      pickupSlot: { $gte: todayStart.toISOString(), $lt: todayEnd.toISOString() },
    }).select('pickupSlot totalCost').lean(),
    DeliveryModel.countDocuments({ deliveryDate: { $gte: todayStart, $lt: todayEnd } }),
    getUpcomingEvents(20),
    getPastEvents(20),
    StaffMemberModel.find({ status: 'active' }).select('name roleKey').sort({ name: 1 }).lean(),
  ]);

  const initialShifts: ShiftRow[] = rawShifts.map((s) => ({
    _id: s._id.toString(),
    dayOfWeek: s.dayOfWeek,
    hourIndex: s.hourIndex,
    staffName: s.staffName,
    role: s.role,
    color: s.color,
  }));

  const shopHours = shopHoursDoc?.days ?? DEFAULT_DAYS;
  const slotsPerHour = settingsDoc?.slotsPerHour ?? 10;

  const slotsBooked = pickupOrders.length;
  const projectedRevenue = pickupOrders.reduce((sum, o) => sum + ((o.totalCost as number) ?? 0), 0);

  // Count pickups per hour slot (slots 0–7 = 9AM–5PM)
  const slotCounts = new Array<number>(8).fill(0);
  for (const order of pickupOrders) {
    if (!order.pickupSlot) continue;
    const hour = new Date(order.pickupSlot as string).getHours();
    const idx = hour - 9; // slot 0 = 9AM
    if (idx >= 0 && idx < 8) slotCounts[idx]++;
  }

  const pickupSlots: PickupSlotRow[] = SLOT_LABELS.map((label, i) => ({
    label,
    count: slotCounts[i],
    max: slotsPerHour,
  }));

  const staffUsers: StaffUserOption[] = rawStaff.map((s) => ({
    _id: s._id.toString(),
    name: s.name,
    roleKey: (s.roleKey ?? 'other') as StaffRoleKey,
  }));

  return (
    <>
      <ScheduleClient
        initialShifts={initialShifts}
        shopHours={shopHours}
        pickupSlots={pickupSlots}
        slotsBooked={slotsBooked}
        projectedRevenue={projectedRevenue}
        deliveryCount={deliveryCount}
        staffUsers={staffUsers}
      />
      <GrillEventSection upcoming={upcomingEvents} past={pastEvents} />
    </>
  );
}
