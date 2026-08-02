import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import { getSessionUser } from '@/lib/auth/session';
import User, { type PointsHistoryEntry, type TierValue } from '@/models/User';
import Product, { type SerializedProduct } from '@/models/Product';
import Order from '@/models/Order';
import MessageModel from '@/models/Message';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  describeRedemptionCap,
  getEffectiveBalance,
  getTierView,
  redeemableValueDollars,
  tierViewToInfo,
  type TierInfo,
  type TierView,
} from '@/lib/rewards/calculator';
import {
  buildHabits,
  findActiveOrder,
  tallyRepeatCuts,
} from '@/lib/profile/dashboard';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';
import type { ProfileOrder } from '@/types/profile';
import { orderHasRealizedDifference, realizedOrderTotal } from '@/lib/orders/line';
import { DELIVERY_FEE } from '@/lib/pricing';
import type { SerializedAddress } from '@/types/address';
import ProfileSidebar from '@/components/profile/dashboard/ProfileSidebar';
import OverviewTab from '@/components/profile/dashboard/OverviewTab';
import AccountTab from '@/components/profile/dashboard/AccountTab';
import { resolveTab } from '@/components/profile/dashboard/tabs';
import type { RepeatCut } from '@/components/profile/dashboard/BuyItAgain';
import ProfileOrderList from '@/components/profile/ProfileOrderList';
import ProfileSavedCuts from '@/components/profile/ProfileSavedCuts';
import ProfileRewards from '@/components/profile/ProfileRewards';
import ProfileMessages, {
  type SerializedMessage,
} from '@/components/profile/ProfileMessages';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

// How many recent orders feed "Buy it again", and how many cuts it offers.
const REPEAT_LOOKBACK = 5;
const REPEAT_LIMIT = 4;

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) redirect('/login');

  await connectDB();

  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const { userId } = sessionUser;

  const rawUser = await User.findById(userId).lean<{
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    savedCuts: Types.ObjectId[];
    addresses: {
      _id: Types.ObjectId;
      label: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zip: string;
      isDefault: boolean;
    }[];
    rewardPoints: number;
    lifetimePoints: number;
    pointsHistory: PointsHistoryEntry[];
    tierAnniversaryAt?: Date;
    currentTier?: TierValue;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>();

  if (!rawUser) return redirect('/login');

  const settings = await getShopSettings();
  const effective = getEffectiveBalance(rawUser);

  // Phase D2 tier-aware view. Pure function — persist if it tells us a
  // reassessment happened (the anniversary just passed) so the customer's
  // currentTier + anniversary stay in sync.
  const tierView: TierView = getTierView(rawUser, settings);
  if (tierView.reassessed) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        currentTier: tierView.tier,
        tierAnniversaryAt: tierView.nextAnniversaryAt,
      },
    });
  } else if (!rawUser.tierAnniversaryAt) {
    // Legacy backfill — stamp the resolved anniversary the first time we
    // compute it so subsequent reads have a stable period start.
    await User.findByIdAndUpdate(userId, {
      $set: { tierAnniversaryAt: tierView.periodStart },
    });
  }

  const tier: TierInfo = tierViewToInfo(tierView, settings);

  const serializedRecentHistory = effective.recentHistory.map((e) => ({
    delta: e.delta,
    reason: e.reason,
    orderId: e.orderId ? String(e.orderId) : undefined,
    createdAt: new Date(e.createdAt).toISOString(),
  }));

  const serializedAddresses: SerializedAddress[] = (rawUser.addresses ?? []).map(
    (a) => ({
      _id: a._id.toString(),
      label: a.label,
      address1: a.address1,
      ...(a.address2 ? { address2: a.address2 } : {}),
      city: a.city,
      state: a.state,
      zip: a.zip,
      isDefault: a.isDefault,
    }),
  );

  const savedCutIds = rawUser.savedCuts ?? [];

  const [rawSavedCuts, rawOrders, rawMessages] = await Promise.all([
    savedCutIds.length > 0
      ? Product.find({ _id: { $in: savedCutIds } })
          .select(PUBLIC_PRODUCT_PROJECTION)
          .lean()
      : [],
    // The full history, not a page of it: "Spent all time" and "Orders this
    // year" sum across every order, so a capped fetch would quietly understate
    // both. Every consumer of this list is a server component, so none of it
    // crosses to the client — the cost is one lean query per render. If a real
    // customer ever accumulates enough orders for that to matter, the answer is
    // to move the habit totals into an aggregation rather than to cap the fetch
    // and let the numbers go wrong.
    Order.find({ user: userId }).sort({ createdAt: -1 }).lean(),
    MessageModel.find({ user: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const serializedSavedCuts = rawSavedCuts.map((p) =>
    convertToSerializableObject(p as unknown as Record<string, unknown>),
  ) as SerializedProduct[];

  const serializedOrders: ProfileOrder[] = rawOrders.map((o) => ({
    _id: String(o._id),
    orderItems: o.orderItems.map((item) => ({
      product: String(item.product),
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price,
      productType: item.productType,
      refunded: item.refunded ?? false,
      pricingType: item.pricingType,
      pricePerLb: item.pricePerLb,
      realizedWeightLb: item.realizedWeightLb,
    })),
    subtotal: o.subtotal,
    tax: o.tax,
    totalCost: o.totalCost,
    ...(orderHasRealizedDifference(o.orderItems) && {
      realizedTotalShift:
        Math.round(
          (realizedOrderTotal({
            lines: o.orderItems,
            subtotal: o.subtotal,
            tax: o.tax,
            memberDiscount: o.memberDiscount,
            promoDiscount: o.promoDiscount,
            pointsRedemptionValueCents: o.pointsRedemptionValueCents,
            deliveryFee: o.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0,
          }) -
            o.totalCost) *
            100,
        ) / 100,
    }),
    isPaid: o.isPaid,
    orderStatus: o.orderStatus,
    paymentMethod: o.paymentMethod,
    pickupLocation: o.pickupLocation,
    pickedUp: o.pickedUp,
    fulfillmentType: o.fulfillmentType,
    pickupSlot: o.pickupSlot,
    settlementStatus: o.paymentResult?.settlementStatus,
    createdAt: (o.createdAt as Date).toISOString(),
    updatedAt: (o.updatedAt as Date).toISOString(),
  }));

  const serializedMessages: SerializedMessage[] = rawMessages.map((m) => ({
    _id: String(m._id),
    subject: m.subject,
    body: m.body,
    ...(m.orderRef ? { orderRef: m.orderRef } : {}),
    status: m.status,
    createdAt: (m.createdAt as Date).toISOString(),
  }));

  // ── Overview derivations ────────────────────────────────────────────────
  const activeOrder = findActiveOrder(serializedOrders);
  const habits = buildHabits(serializedOrders, settings.timezone);

  // Repeat cuts are tallied from order history, then resolved against the
  // live catalog — a cut the shop has since withdrawn or deactivated drops
  // out rather than being offered back to someone known to want it.
  // Cuts already in the active order are left out — they are named in the
  // card at the top of the page and listed again under recent orders, so
  // offering them a third time reads as the page repeating itself rather than
  // as a suggestion.
  const tallies = tallyRepeatCuts(serializedOrders, {
    lookback: REPEAT_LOOKBACK,
    excludeProductIds: activeOrder?.orderItems.map((i) => i.product) ?? [],
  });
  let repeatCuts: RepeatCut[] = [];
  if (tallies.length > 0) {
    const liveDocs = await Product.find({
      ...VISIBLE_PRODUCT_FILTER,
      _id: { $in: tallies.map((t) => t.productId) },
    })
      .select(PUBLIC_PRODUCT_PROJECTION)
      .lean();
    const byId = new Map(
      liveDocs.map((doc) => {
        const product = convertToSerializableObject(
          doc as unknown as Record<string, unknown>,
        ) as SerializedProduct;
        return [product._id, product];
      }),
    );
    repeatCuts = tallies
      .map((t) => {
        const product = byId.get(t.productId);
        return product ? { product, times: t.times } : null;
      })
      .filter((c): c is RepeatCut => c !== null)
      .slice(0, REPEAT_LIMIT);
  }

  const displayName = sessionUser.user.name ?? rawUser.name ?? 'Member';
  const displayEmail = sessionUser.user.email ?? rawUser.email ?? '';
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const isDemo = Boolean(sessionUser.user.isDemo);
  const isAdmin = rawUser.isAdmin ?? false;

  const openMessages = serializedMessages.filter(
    (m) => m.status === 'open',
  ).length;

  return (
    <div className="bg-cream min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-350 px-5 md:px-8">
        <div className="grid grid-cols-1 items-start gap-0 lg:grid-cols-[250px_1fr] lg:gap-10">
          <ProfileSidebar
            name={displayName}
            email={displayEmail}
            userId={userId}
            isAdmin={isAdmin}
            isDemo={isDemo}
            tier={tier}
            qualifying={tierView.qualifying}
            activeTab={activeTab}
            counts={{
              orders: serializedOrders.length,
              saved: serializedSavedCuts.length,
              messages: openMessages,
            }}
          />

          {/* A plain div, not <main>: the (main) route-group layout already
              wraps every page in one, and <main> must not descend from <main>
              — it was announcing two main landmarks on this page alone. */}
          <div className="min-w-0 py-8 lg:py-10">
            {activeTab === 'overview' && (
              <OverviewTab
                firstName={firstName}
                orders={serializedOrders}
                activeOrder={activeOrder}
                repeatCuts={repeatCuts}
                habits={habits}
                leadTime={settings.leadTime}
                timezone={settings.timezone}
                points={effective.balance}
                worthDollars={redeemableValueDollars(
                  effective.balance,
                  settings,
                )}
                capNote={describeRedemptionCap(settings)}
              />
            )}

            {activeTab === 'orders' && (
              <section>
                <h1 className="font-display text-[34px] leading-none tracking-tight sm:text-[40px]">
                  Your <em className="italic text-oxblood">orders</em>
                </h1>
                <p className="mt-3 text-[14px] text-muted">
                  {serializedOrders.length === 0
                    ? 'Nothing here yet.'
                    : `${serializedOrders.length} order${serializedOrders.length === 1 ? '' : 's'} · every one collected at the counter.`}
                </p>
                <div className="mt-7">
                  <ProfileOrderList orders={serializedOrders} showAll />
                </div>
              </section>
            )}

            {activeTab === 'saved' && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="font-display text-[34px] leading-none tracking-tight sm:text-[40px]">
                      Saved <em className="italic text-oxblood">cuts</em>
                    </h1>
                    <p className="mt-3 text-[14px] text-muted">
                      Anything you tapped the heart on.
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-4.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    Browse cuts
                  </Link>
                </div>
                <div className="mt-7">
                  <ProfileSavedCuts savedCuts={serializedSavedCuts} showAll />
                </div>
              </section>
            )}

            {activeTab === 'rewards' && (
              <ProfileRewards
                points={effective.balance}
                lifetimePoints={effective.lifetimePoints}
                expiredPoints={effective.expiredPoints}
                tier={tier}
                qualifyingPoints={tierView.qualifying}
                periodEndsAt={tierView.periodEndsAt?.toISOString() ?? null}
                recentHistory={serializedRecentHistory}
                redemptionPoints={settings.redemptionPoints}
                redemptionDollars={settings.redemptionDollars}
                pointsExpiryMonths={settings.pointsExpiryMonths}
                weekendMultiplier={settings.weekendMultiplier}
                maxRedemptionPercent={settings.maxRedemptionPercent}
                maxRedemptionDollars={settings.maxRedemptionDollars}
                pointsPerDollar={settings.pointsPerDollar}
              />
            )}

            {activeTab === 'messages' && (
              <ProfileMessages
                messages={serializedMessages}
                userId={userId}
                name={displayName}
                isAdmin={isAdmin}
                isMember={tier.tier !== 'regular'}
              />
            )}

            {activeTab === 'account' && (
              <AccountTab
                name={displayName}
                email={displayEmail}
                phone={rawUser.phone ?? ''}
                addresses={serializedAddresses}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
