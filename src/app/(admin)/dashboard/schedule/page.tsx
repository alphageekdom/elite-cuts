import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import ShiftModel from '@/models/Shift';
import ShopHoursModel, { DEFAULT_DAYS } from '@/models/ShopHours';
import ShopSettingsModel from '@/models/ShopSettings';
import Order from '@/models/Order';
import DeliveryModel from '@/models/Delivery';
import StaffMemberModel from '@/models/StaffMember';
import type { StaffRoleKey } from '@/lib/staff/display';
import ScheduleClient from '@/components/admin/schedule/ScheduleClient';
import type { ShiftRow, StaffUserOption } from '@/lib/admin/schedule';
import GrillEventSection from '@/components/grill-event/GrillEventSection';
import type { PickupSlotRow } from '@/components/admin/schedule/SchedulePickupSlots';
import { mondayOfShopDay, SLOT_LABELS } from '@/lib/shifts/schedule';
import { normalizeWeekStart } from '@/lib/shifts/queries';
import { bucketPickupSlotCounts, buildTodayDateLabel } from '@/lib/admin/schedule';
import { slotRangeForDay } from '@/lib/admin/cut-list';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  shopDateKey,
  shopMinutesOfDay,
  shopWeekdayIndex,
} from '@/lib/shop-settings/pickup-format';
import { getPastEvents, getUpcomingEvents } from '@/lib/events/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Schedule · Admin',
};

export default async function AdminSchedulePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  // Week start on the shop's clock, not the server's: from Sunday evening
  // Pacific (already Monday UTC) this page used to jump a week ahead of the
  // counter, showing an empty grid. `shopSettings` is resolved below, so the
  // shop date is read there and the week derived from it.
  const shopSettingsForWeek = await getShopSettings();
  const weekStart = normalizeWeekStart(
    mondayOfShopDay(shopDateKey(shopSettingsForWeek.timezone, new Date())),
  );
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  // Deliveries store real timestamps, so they are bounded by the server's own
  // midnight. Pickup slots do not — they are shop-local wall time with no
  // zone, so they get wall-time bounds built from the shop's date instead.
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const shopSettings = await getShopSettings();
  // The shop's date is derived from the current instant, never from
  // `todayStart`: server-local midnight is an instant that falls on
  // *yesterday* in shop time for most of a UTC server's day, so passing it
  // here showed yesterday's slots from midnight shop time until midnight UTC.
  const todaySlots = slotRangeForDay(shopDateKey(shopSettings.timezone, now));

  const [rawShifts, shopHoursDoc, settingsDoc, pickupOrders, deliveryCount, upcomingEvents, pastEvents, rawStaff] = await Promise.all([
    ShiftModel.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean(),
    ShopHoursModel.findOneAndUpdate({}, {}, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean(),
    ShopSettingsModel.findOneAndUpdate({}, {}, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean(),
    Order.find({
      pickupSlot: { $gte: todaySlots.start, $lt: todaySlots.end },
    }).select('pickupSlot totalCost').lean(),
    DeliveryModel.countDocuments({ deliveryDate: { $gte: todayStart, $lt: todayEnd } }),
    getUpcomingEvents(20),
    getPastEvents(20),
    StaffMemberModel.find({ status: { $ne: 'inactive' } }).select('name roleKey').sort({ name: 1 }).lean(),
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

  const slotCounts = bucketPickupSlotCounts(pickupOrders.map((o) => o.pickupSlot as string | null));

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
        initialWeekStart={weekStart.toISOString()}
        todayMondayIndex={shopWeekdayIndex(shopSettingsForWeek.timezone, new Date())}
        nowMinutes={shopMinutesOfDay(shopSettingsForWeek.timezone, new Date()) ?? 0}
        todayLabel={buildTodayDateLabel(
          shopDateKey(shopSettingsForWeek.timezone, new Date()),
        )}
      />
      <GrillEventSection upcoming={upcomingEvents} past={pastEvents} />
    </>
  );
}
