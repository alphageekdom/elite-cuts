import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import type { Types } from 'mongoose';

import ProductModel from '@/models/Product';
import MessageModel from '@/models/Message';
import ShiftModel from '@/models/Shift';
import StaffMemberModel from '@/models/StaffMember';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DashboardStatGrid from '@/components/admin/dashboard/DashboardStatGrid';
import DashboardTopCuts from '@/components/admin/dashboard/DashboardTopCuts';
import DashboardRecentOrders from '@/components/admin/dashboard/DashboardRecentOrders';
import type { OrderRow } from '@/components/admin/dashboard/DashboardRecentOrders';
import DashboardCutList from '@/components/admin/dashboard/DashboardCutList';
import DashboardActionCards, {
  type ActionCard,
} from '@/components/admin/dashboard/DashboardActionCards';
import DashboardOnTheFloor from '@/components/admin/dashboard/DashboardOnTheFloor';
import DashboardReorderCard, {
  type ReorderRow,
} from '@/components/admin/dashboard/DashboardReorderCard';
import DashboardWaitingOnYou, {
  type InboxRow,
} from '@/components/admin/dashboard/DashboardWaitingOnYou';
import RevenueCard from '@/components/admin/analytics/RevenueCard';
import { excludeDemoOrders, getDemoOwnerIds } from '@/lib/demo/exclude';
import { orderRef } from '@/lib/orders/reference';
import {
  buildCutListRows,
  slotRangeForDay,
  summariseCutList,
  type CutListOrder,
} from '@/lib/admin/cut-list';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  shopDateKey,
  shopWallClockMs,
  shopWeekdayIndex,
  shopLongDate,
} from '@/lib/shop-settings/pickup-format';
import { buildTodayStaff, type ShiftRow } from '@/lib/admin/schedule';
import { CATEGORY_PAR, DEFAULT_PAR, getStockState } from '@/lib/inventory';
import { mondayOfShopDay } from '@/lib/shifts/schedule';
import { normalizeWeekStart } from '@/lib/shifts/queries';
import {
  DAY_MS,
  RANGE_DAYS,
  RANGE_BUCKETS,
  parseRange,
  buildRangeBuckets,
} from '@/lib/admin/range-buckets';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

// How many below-par cuts and open messages the sidecar cards list before
// deferring to their full tab. Both are "what needs me now" cards, not tables.
const SIDECAR_LIMIT = 3;

/**
 * Who an order is for. A guest order has no `user`, but it does carry the
 * contact typed at checkout — rendering "Guest" or "Unknown" instead throws
 * that away.
 *
 * Shared between the board and the recent-orders table because they sit one
 * above the other: when the two chains drifted, the same order appeared as
 * "Guest" on one and "Unknown" on the other.
 */
function orderCustomerName(
  order: { guestContact?: { name?: string }; contactName?: string },
  user: PopulatedUser | null,
): string {
  return user?.name ?? order.guestContact?.name ?? order.contactName ?? 'Guest';
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard · Admin',
};

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const rangeDays = RANGE_DAYS[range];
  const bucketCfg = RANGE_BUCKETS[range];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_MS);
  const chartWindowStart = new Date(now.getTime() - rangeDays * DAY_MS);
  const chartPrevWindowStart = new Date(now.getTime() - 2 * rangeDays * DAY_MS);

  // Phase D — exclude demo activity from every admin aggregate so it
  // doesn't move the real metrics. `excludeDemo` filters out orders belonging
  // to EITHER demo account and resolves to `{}` when neither exists. The user
  // filter is a flat `{ isDemo: { $ne: true } }` so both demo accounts drop
  // out of user counts.
  //
  // It used to scope to the demo customer alone, on the belief that the demo
  // admin places no orders. They can: the checkout path accepts any demo
  // session, which is why the nightly wipe clears both accounts too.
  const excludeDemo = await excludeDemoOrders();
  const excludeDemoUser = { isDemo: { $ne: true } };

  // The cut list is the one aggregate that deliberately does NOT exclude demo
  // activity. `excludeDemoOrders` exists so a recruiter's clicks don't move the
  // shop's *metrics* — but this is a work board, not a metric, and the demo
  // customer's order is the only one a freshly seeded database schedules for
  // today. Excluding it would leave the demo admin's landing page permanently
  // empty. Demo rows carry a Demo pill so nothing is disguised; every revenue
  // and trading number below keeps the exclusion untouched.
  //
  // Resolves BOTH demo accounts, matching what `excludeDemoOrders` filters. A
  // row flagged here links to the orders tab with `includeDemo=true`; flagging
  // only the customer meant a demo-ADMIN order rendered on this board, linked
  // without the flag, and landed on a page whose filter had just dropped it —
  // a dead click.
  const demoOwnerIds = new Set(
    (await getDemoOwnerIds()).map((id) => id.toString()),
  );

  // Today at the *shop*, not on the server. `getShopSettings` is request-cached
  // and the root layout has already primed it, so this costs no extra query.
  const shopSettings = await getShopSettings();

  // Week start on the shop's clock too: `getMondayOf(now)` reads the server's
  // weekday, so from Sunday evening Pacific (already Monday UTC) all three
  // shift-reading pages jumped a week ahead of the counter.
  const shopToday = shopDateKey(shopSettings.timezone, now);
  const weekStart = normalizeWeekStart(mondayOfShopDay(shopToday));
  const todaySlots = slotRangeForDay(shopToday);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  const [
    rawOrders, topCutsRaw,
    chartOrders, chartPrevOrders,
    currentPeriodAgg, prevPeriodAgg, currentCustomers, prevCustomers,
    todaysOrders, undatedActiveOrders,
    rawShifts, staffTotal,
    lowStockProducts, openMessages, openMessageCount,
  ] = await Promise.all([
      Order.find(excludeDemo)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate<{ user: PopulatedUser | null }>('user', 'name email')
        .lean()
        .exec(),
      // Top 5 cuts by revenue in last 30 days
      Order.aggregate<{ _id: string; revenue: number; sold: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: '$orderItems.name',
            revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
            sold: { $sum: '$orderItems.qty' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      // Orders inside the active chart range — bucketed in JS so bucket size
      // (daily / weekly / biweekly / monthly) varies with the selected range.
      Order.find(
        { ...excludeDemo, createdAt: { $gte: chartWindowStart } },
        'createdAt totalCost',
      ).lean().exec(),
      // Same shape, previous comparable period.
      Order.find(
        { ...excludeDemo, createdAt: { $gte: chartPrevWindowStart, $lt: chartWindowStart } },
        'createdAt totalCost',
      ).lean().exec(),
      // Current 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // Prior 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // New customers: current 30 days
      User.countDocuments({ ...excludeDemoUser, createdAt: { $gte: thirtyDaysAgo } }),
      // New customers: prior 30 days
      User.countDocuments({
        ...excludeDemoUser,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),
      // Today's cut list. String range on the ISO-like `pickupSlot`, the same
      // comparison the schedule page's slot buckets already run.
      Order.find({
        pickupSlot: { $gte: todaySlots.start, $lt: todaySlots.end },
      })
        .populate<{ user: PopulatedUser | null }>('user', 'name email')
        .lean()
        .exec(),
      // In-flight orders whose slot is prose rather than a datetime, so the
      // board can say so instead of implying it shows everything due today.
      // Only ever read as a boolean, so stop at the first match rather than
      // counting every prose-slotted order in the collection.
      Order.exists({
        orderStatus: { $in: ['Order Placed', 'Preparing', 'Ready for Pickup', 'Out for Delivery'] },
        pickupSlot: { $exists: true, $ne: '', $not: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ },
      }),
      ShiftModel.find({ weekStart: { $gte: weekStart, $lt: weekEnd } }).lean().exec(),
      StaffMemberModel.countDocuments({ status: { $ne: 'inactive' } }),
      // Par is per-category, matching the inventory page and the nav badge —
      // `Product.parLevel` exists but no read path consumes it, and diverging
      // here would make the dashboard disagree with the tab it links to.
      ProductModel.find({ isArchived: { $ne: true }, isActive: { $ne: false } })
        .select('name category stockCount supplier')
        .lean()
        .exec(),
      MessageModel.find({ status: 'open' })
        .sort({ createdAt: 1 })
        .limit(SIDECAR_LIMIT)
        .populate<{ user: PopulatedUser | null }>('user', 'name')
        .lean()
        .exec(),
      MessageModel.countDocuments({ status: 'open' }),
    ]);

  // Headline stat values use the active 30-day window so the value and its
  // change pill compare the same period — see context history 2026-05-13.
  const currentMonthRevenue = currentPeriodAgg[0]?.total ?? 0;
  const currentMonthOrders  = currentPeriodAgg[0]?.count ?? 0;
  const prevMonthRevenue    = prevPeriodAgg[0]?.total ?? 0;
  const prevMonthOrders     = prevPeriodAgg[0]?.count ?? 0;

  // Top cuts — normalize bar widths relative to the highest earner
  const maxRevenue = topCutsRaw[0]?.revenue ?? 1;
  const topCuts = topCutsRaw.map((c) => ({
    name: c._id,
    revenue: c.revenue,
    sold: c.sold,
    widthPct: Math.round((c.revenue / maxRevenue) * 100),
  }));

  const chartBuckets = buildRangeBuckets(range, now, chartOrders, chartPrevOrders);
  const chartTotal = chartOrders.reduce((s, o) => s + o.totalCost, 0);
  const chartPrevTotal = chartPrevOrders.reduce((s, o) => s + o.totalCost, 0);

  const orders: OrderRow[] = rawOrders.map((order) => {
    const idStr = order._id.toString();
    const user = order.user;
    const firstItem = order.orderItems[0];

    return {
      id: idStr,
      orderRef: orderRef(idStr),
      customerName: orderCustomerName(order, user),
      customerEmail: user?.email ?? order.guestContact?.email ?? order.contactEmail ?? '',
      cut: firstItem ? `${firstItem.name} · ${firstItem.qty}${firstItem.qty > 1 ? 'x' : ''}` : 'Unknown',
      status: order.orderStatus,
      total: order.totalCost,
    };
  });

  // — Cut list
  const cutListOrders: CutListOrder[] = todaysOrders.map((o) => {
    const idStr = o._id.toString();
    const user = o.user;
    return {
      id: idStr,
      orderRef: orderRef(idStr),
      customerName: orderCustomerName(o, user),
      isGuest: !user,
      isDemo: !!user && demoOwnerIds.has(user._id.toString()),
      pickupSlot: o.pickupSlot ?? '',
      orderStatus: o.orderStatus,
      items: o.orderItems.map((i) => ({ name: i.name, qty: i.qty })),
      orderNotes: o.orderNotes,
    };
  });
  const cutRows = buildCutListRows(
    cutListOrders,
    shopWallClockMs(shopSettings.timezone, now),
  );
  const cutSummary = summariseCutList(cutRows);

  // — Below par
  const belowPar = lowStockProducts
    .map((p) => {
      const par = CATEGORY_PAR[p.category] ?? DEFAULT_PAR;
      return { product: p, par, state: getStockState(p.stockCount, par) };
    })
    .filter(({ state }) => state === 'critical' || state === 'out')
    .sort((a, b) => a.product.stockCount / a.par - b.product.stockCount / b.par);

  const reorderRows: ReorderRow[] = belowPar.slice(0, SIDECAR_LIMIT).map(({ product, par }) => ({
    id: product._id.toString(),
    name: product.name,
    stock: product.stockCount,
    par,
    pct: Math.min(100, Math.round((product.stockCount / par) * 100)),
    supplier: product.supplier?.trim() ? product.supplier : null,
  }));

  // — On the floor
  const shiftRows: ShiftRow[] = rawShifts.map((s) => ({
    _id: s._id.toString(),
    dayOfWeek: s.dayOfWeek,
    hourIndex: s.hourIndex,
    staffName: s.staffName,
    role: s.role,
    color: s.color,
  }));
  const todayStaff = buildTodayStaff(
    shiftRows,
    shopWeekdayIndex(shopSettings.timezone, now),
  );

  // — Waiting on you
  const inboxRows: InboxRow[] = openMessages.map((m) => {
    const author = m.user;
    return {
      id: m._id.toString(),
      authorName: author?.name ?? m.authorNameSnapshot ?? 'Customer',
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    };
  });

  // — Action cards. Every number above, in the order an admin asks for it.
  const actionCards: ActionCard[] = [
    {
      label: 'Still to cut',
      value: cutSummary.outstanding,
      unit: cutSummary.outstanding === 1 ? 'order' : 'orders',
      meta:
        cutSummary.total === 0
          ? 'Nothing booked in for today'
          : cutSummary.outstanding === 0
          ? 'Every order today has been handed over'
          : cutSummary.nextSlotLabel
            ? `Next window at ${cutSummary.nextSlotLabel}`
            : `${cutSummary.overdue} past ${cutSummary.overdue === 1 ? 'its' : 'their'} window`,
      href: '/dashboard/orders',
      tone: 'dark',
    },
    {
      label: 'Ready for pickup',
      value: cutSummary.readyForPickup,
      unit: cutSummary.readyForPickup === 1 ? 'order' : 'orders',
      meta:
        cutSummary.readyForPickup > 0
          ? 'Wrapped and waiting on the shelf'
          : 'Nothing waiting to be collected',
      href: '/dashboard/orders',
      tone: cutSummary.readyForPickup > 0 ? 'warn' : 'plain',
    },
    {
      label: 'Below par',
      value: belowPar.length,
      unit: belowPar.length === 1 ? 'cut' : 'cuts',
      meta:
        belowPar.length > 0
          ? belowPar.slice(0, 2).map(({ product }) => product.name).join(', ')
          : 'Every cut is at or above par',
      href: '/dashboard/inventory',
      tone: belowPar.length > 0 ? 'alert' : 'plain',
    },
    {
      // "Unanswered" overclaimed: a Message is a single body with an open or
      // closed status and no reply channel, so nothing here knows whether it
      // was answered — only whether an admin has closed it. The messages tab
      // says "Open", and so does this.
      label: 'Still open',
      value: openMessageCount,
      unit: openMessageCount === 1 ? 'message' : 'messages',
      meta:
        inboxRows.length > 0
          ? `Oldest from ${inboxRows[0].authorName}`
          : 'Nothing left open',
      href: '/dashboard/messages',
      tone: openMessageCount > 0 ? 'alert' : 'plain',
    },
  ];

  const name = sessionUser.user.name ?? 'Admin';
  // Named on the SHOP's clock, like the board it sits above. Reading the
  // runtime's day meant a UTC deploy serving a Pacific shop printed tomorrow's
  // date from 5pm local — directly over a cut list bounded by
  // `slotRangeForDay(shopToday)` and an "On today" card built from the shop's
  // weekday, both of which still said today.
  const today = shopLongDate(shopSettings.timezone, now);

  // The subtitle only claims what the queries above actually counted.
  const headline = [
    cutSummary.total > 0
      ? `${cutSummary.total} ${cutSummary.total === 1 ? 'order' : 'orders'} on the board`
      : 'nothing on the board',
    belowPar.length > 0
      ? `${belowPar.length} ${belowPar.length === 1 ? 'cut' : 'cuts'} below par`
      : null,
    openMessageCount > 0
      ? `${openMessageCount} ${openMessageCount === 1 ? 'message' : 'messages'} still open`
      : null,
  ].filter(Boolean);

  return (
    <>
      <AdminPageHeader
        eyebrow={`Welcome back, ${name}`}
        breadcrumb="Overview"
        title="Today at the"
        titleAccent="counter."
        subtitle={
          <>
            {today}
            <span className="mx-2">·</span>
            {headline.join(', ')}.
          </>
        }
      />

      <DashboardActionCards cards={actionCards} />

      <DashboardCutList
        rows={cutRows}
        summary={cutSummary}
        hasUnplaceableOrders={undatedActiveOrders !== null}
      />

      {/* One two-column flow rather than stacked grids. Two grids meant each
          row took the height of its taller column, leaving a dead gap under
          whichever side ran short — visible as ~180px of empty cream under the
          revenue chart. `items-start` lets each column run to its own height. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <DashboardStatGrid
            currentRevenue={currentMonthRevenue}
            prevRevenue={prevMonthRevenue}
            currentOrders={currentMonthOrders}
            prevOrders={prevMonthOrders}
            currentNewCustomers={currentCustomers}
            prevNewCustomers={prevCustomers}
          />
          <RevenueCard
            range={range}
            buckets={chartBuckets}
            bucketUnit={bucketCfg.unit}
            revenueTotal={chartTotal}
            revenuePrevTotal={chartPrevTotal}
            basePath="/dashboard"
          />
          <DashboardRecentOrders orders={orders} />
        </div>

        <div className="flex flex-col gap-4">
          <DashboardReorderCard rows={reorderRows} criticalCount={belowPar.length} />
          <DashboardOnTheFloor
            staff={todayStaff}
            rosteredCount={todayStaff.length}
            totalCount={staffTotal}
          />
          <DashboardWaitingOnYou rows={inboxRows} openCount={openMessageCount} />
          <DashboardTopCuts cuts={topCuts} />
        </div>
      </div>
    </>
  );
}
